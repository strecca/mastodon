# app/controllers/api/v1/community_directory_controller.rb

class Api::V1::CommunityDirectoryController < Api::BaseController
  before_action :require_user!
  before_action :require_admin!, except: [:moderation_index, :moderation_approve, :moderation_reject, :duplicate_check]
  before_action :require_admin_or_steward!, only: [:moderation_index, :moderation_approve, :moderation_reject]

  # ── Category scaffolding ─────────────────────────────────────

  def categories
    tables = community_table_names.map { |key| build_category_info("community_#{key}") }
    render json: tables
  end

  def show_category
    config_path = category_config_path(params[:name])
    if File.exist?(config_path)
      render json: JSON.parse(File.read(config_path))
    else
      render json: { error: 'Category not found' }, status: :not_found
    end
  end

  def generate
    config = permit_config_params
    result = CommunityDirectoryGenerator.new(config).generate!
    render json: result, status: result[:success] ? :created : :unprocessable_entity
  end

  def update_category
    config = permit_config_params
    result = CommunityDirectoryUpdater.new(params[:name], config).update!
    render json: result, status: result[:success] ? :ok : :unprocessable_entity
  end

  # ── Moderation queue ─────────────────────────────────────────

  def moderation_index
    is_admin = current_user&.can?(:administrator)
    keys = is_admin ? community_table_names : steward_category_keys

    pending = keys.flat_map do |category_key|
      model = model_for_category(category_key)
      next [] unless model && model.column_names.include?('status')
      model.where(status: :pending).includes(:account).map { |e| moderation_serialize(e, category_key) }
    end

    render json: pending.sort_by { |e| e[:submitted_at] }.reverse
  end

  def moderation_approve
    entry, category_key = find_moderation_entry
    return unless entry

    unless admin_or_steward_for?(category_key)
      render json: { error: 'Forbidden' }, status: :forbidden and return
    end

    entry.update!(status: :approved)
    CommunityDirectoryMailer.entry_approved(entry, category_key).deliver_later
    render json: { success: true, id: entry.id, status: 'approved' }
  end

  def moderation_reject
    entry, category_key = find_moderation_entry
    return unless entry

    unless admin_or_steward_for?(category_key)
      render json: { error: 'Forbidden' }, status: :forbidden and return
    end

    entry.update!(status: :rejected)
    render json: { success: true, id: entry.id, status: 'rejected' }
  end

  # ── Permissions ──────────────────────────────────────────────

  def permissions_index
    perms = CommunityDirectoryPermission.includes(:account).order(:created_at)
    render json: perms.map { |p| serialize_permission(p) }
  end

  def permissions_create
    account = Account.find_by!(username: params[:username].to_s.delete_prefix('@'))
    perm = CommunityDirectoryPermission.find_or_initialize_by(
      account:      account,
      category_key: params[:category_key].presence
    )
    perm.update!(
      trusted:    ActiveModel::Type::Boolean.new.cast(params[:trusted]),
      is_steward: ActiveModel::Type::Boolean.new.cast(params[:is_steward]),
      notes:      params[:notes]
    )
    render json: serialize_permission(perm), status: :created
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Account not found: #{params[:username]}" }, status: :not_found
  end

  def permissions_destroy
    perm = CommunityDirectoryPermission.find(params[:id])
    perm.destroy!
    head :no_content
  end

  # ── Duplicate detection ──────────────────────────────────────

  def duplicate_check
    category_key = params[:category].to_s
    model = model_for_category(category_key)
    return render json: { matches: [] } unless model

    config_path = category_config_path(category_key)
    return render json: { matches: [] } unless File.exist?(config_path)

    config = JSON.parse(File.read(config_path))
    all_text = (config['fields'] || []).select { |f| f['widget'] == 'text' && f['required'] }
    text_fields = all_text.select { |f| f['duplicate_key'] }
    text_fields = all_text.first(2) if text_fields.empty?
    return render json: { matches: [] } if text_fields.empty?

    submitted_concat = text_fields.map { |f| params[f['db_name']].to_s.strip }.join(' ')
    return render json: { matches: [] } if submitted_concat.blank?

    submitted_key = submitted_concat.downcase[0, 50]
    conn = model.connection
    concat_sql = text_fields.map { |f| "COALESCE(#{conn.quote_column_name(f['db_name'])}, '')" }.join(" || ' ' || ")

    matches = model.where(status: [0, 1])
                   .where("LOWER(SUBSTRING(#{concat_sql}, 1, 50)) = ?", submitted_key)
                   .limit(5)
                   .map do |entry|
                     preview = text_fields.map { |f| entry.send(f['db_name']).to_s }.join(' ')
                     { id: entry.id, preview: preview, status: entry.status }
                   end

    render json: { matches: }
  end

  # ── Category settings (rate limits) ──────────────────────────

  def settings_index
    settings = CommunityDirectoryCategorySetting.all.index_by(&:category_key)
    result = community_table_names.map do |key|
      s = settings[key]
      { category_key: key,
        requires_approval:       s&.requires_approval.nil? ? true : s.requires_approval,
        max_entries_per_account: s&.max_entries_per_account,
        period_days:             s&.period_days,
        stale_reject_after_days: s&.stale_reject_after_days }
    end
    render json: result
  end

  def settings_update
    key = params[:category_key]
    setting = CommunityDirectoryCategorySetting.find_or_initialize_by(category_key: key)
    setting.update!(
      requires_approval:       ActiveModel::Type::Boolean.new.cast(params.fetch(:requires_approval, true)),
      max_entries_per_account: params[:max_entries_per_account].presence&.to_i,
      period_days:             params[:period_days].presence&.to_i,
      stale_reject_after_days: params[:stale_reject_after_days].presence&.to_i
    )
    render json: { category_key: key, requires_approval: setting.requires_approval,
                   max_entries_per_account: setting.max_entries_per_account,
                   period_days: setting.period_days,
                   stale_reject_after_days: setting.stale_reject_after_days }
  end

  private

  # ── Auth helpers ─────────────────────────────────────────────

  def require_admin!
    render json: { error: 'Admin access required' }, status: :forbidden unless current_user&.can?(:administrator)
  end

  def require_admin_or_steward!
    return if current_user&.can?(:administrator)
    return if CommunityDirectoryPermission.exists?(account: current_account, is_steward: true)
    render json: { error: 'Admin or steward access required' }, status: :forbidden
  end

  def admin_or_steward_for?(category_key)
    return true if current_user&.can?(:administrator)
    CommunityDirectoryPermission.exists?(account: current_account, category_key: category_key, is_steward: true)
  end

  def steward_category_keys
    CommunityDirectoryPermission
      .where(account: current_account, is_steward: true)
      .pluck(:category_key)
      .compact
  end

  # ── Moderation helpers ───────────────────────────────────────

  def find_moderation_entry
    key   = params[:category_key].to_s
    model = model_for_category(key)
    unless model
      render json: { error: 'Category not found' }, status: :not_found
      return [nil, nil]
    end

    entry = model.find(params[:entry_id])
    [entry, key]
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Entry not found' }, status: :not_found
    [nil, nil]
  end

  def moderation_serialize(entry, category_key)
    config_path = Rails.root.join('app', 'javascript', 'flavours', 'glitch', 'features',
                                   "community_#{category_key}", 'config.json')
    config = File.exist?(config_path) ? JSON.parse(File.read(config_path)) : {}

    preview_fields = (config['fields'] || []).first(4).filter_map do |f|
      val = entry.respond_to?(f['db_name']) ? entry.send(f['db_name']).to_s : nil
      val.present? ? { label: f['label'], value: val } : nil
    end

    { id: entry.id,
      category_key: category_key,
      category_display_name: config['display_name'] || category_key.titleize,
      status: entry.status,
      submitted_at: entry.created_at.iso8601,
      account: { id: entry.account.id, username: entry.account.username,
                 display_name: entry.account.display_name,
                 avatar: entry.account.avatar_original_url },
      fields: preview_fields }
  end

  # ── Serializers ──────────────────────────────────────────────

  def serialize_permission(p)
    { id: p.id, category_key: p.category_key,
      trusted: p.trusted, is_steward: p.is_steward, notes: p.notes,
      account: { id: p.account.id, username: p.account.username,
                 display_name: p.account.display_name,
                 avatar: p.account.avatar_original_url },
      created_at: p.created_at.iso8601 }
  end

  # ── Category helpers ─────────────────────────────────────────

  EXCLUDED_TABLES = %w[community_directory community_directory_permissions community_directory_category_settings community_entry_translations].freeze

  def community_table_names
    ActiveRecord::Base.connection.tables
      .select { |t| t.start_with?('community_') && EXCLUDED_TABLES.exclude?(t) }
      .map { |t| t.delete_prefix('community_') }
  end

  def model_for_category(category_key)
    "Community#{category_key.camelize}".constantize
  rescue NameError
    nil
  end

  def permit_config_params
    # Admin-only endpoint — use permit! on fields/groups so locale keys
    # (label_it, placeholder_de, etc.) and new flags (translatable, duplicate_key)
    # are not stripped by Strong Parameters.
    p = params.permit(:name, :display_name, :description, :icon).to_h
    p['fields'] = params[:fields]&.map(&:permit!) || []
    p['groups'] = params[:groups]&.map(&:permit!) || []
    p
  end

  def category_config_path(name)
    safe = name.to_s.strip.downcase.gsub(/[^a-z0-9_]/, '')
    Rails.root.join('app', 'javascript', 'flavours', 'glitch', 'features', "community_#{safe}", 'config.json')
  end

  def build_category_info(table_name)
    config_path = Rails.root.join('app', 'javascript', 'flavours', 'glitch', 'features', table_name, 'config.json')
    count = begin
      ActiveRecord::Base.connection
        .execute("SELECT COUNT(*) FROM #{ActiveRecord::Base.connection.quote_table_name(table_name)}")
        .first['count'].to_i
    rescue StandardError
      0
    end

    if File.exist?(config_path)
      config = JSON.parse(File.read(config_path))
      { name: config['category_key'], display_name: config['display_name'],
        description: config['description'], icon: config['icon'],
        table_name: table_name, entries_count: count }
    else
      { name: table_name.delete_prefix('community_'), display_name: table_name.titleize,
        description: '', icon: 'category', table_name: table_name, entries_count: count }
    end
  end
end
