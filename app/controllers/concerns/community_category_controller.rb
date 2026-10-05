# frozen_string_literal: true

# Shared CRUD/authorization/rate-limiting/serialization logic for the five
# near-identical generated community category controllers (artists, events,
# properties, restaurants, services -- NOT community_listings, which is
# hand-built and intentionally excluded from this pattern).
#
# Confirmed via a full line-by-line read of all five controllers
# (2026-10-05) that everything below was byte-identical except: the model
# class, CATEGORY_KEY, the sort menu, entry_params' field list, and
# serialize's field list -- those five stay in each including controller.
# Two real differences were found and are preserved via method overrides,
# not baked in here: Events caps photo uploads at 2 (everyone else is 3,
# see `max_media_ids`), and Events' sort menu has different option names
# entirely (see each controller's own `sort_for`).
#
# Including controllers MUST define CATEGORY_KEY and MODEL, and include this
# concern AFTER both constants are set (CommunityCacheable's `included do`
# block reads `self::CATEGORY_KEY` immediately, so it must already exist).
# Each including controller still defines its own: sort_for, entry_params,
# serialize (using the `base_entry_fields`/`translations_for` helpers below).
module CommunityCategoryController
  extend ActiveSupport::Concern

  included do
    include CommunityCacheable

    skip_before_action :require_authenticated_user!, only: [:index, :show]
    before_action :require_user!, only: [:create, :update, :destroy]
    before_action :set_entry, only: [:show, :update, :destroy]
    before_action :authorize_owner!, only: [:update, :destroy]
  end

  def index
    sort_col, sort_dir = sort_for(params[:sort])

    result = cached_list do
      entries = self.class::MODEL.includes(:account)
                                  .search(params[:q])
                                  .where(status: :approved)
                                  .order(sort_col => sort_dir)
                                  .select(*list_columns)
                                  .page(params[:page]).per(params[:per_page] || 20)

      { entries: entries.map { |e| serialize(e, detail: false) },
        total: entries.total_count, page: entries.current_page, pages: entries.total_pages }
    end

    inject_list_translations(result, self.class::MODEL.name)
    render json: result
  end

  def show
    render json: serialize(@entry, detail: true)
  end

  def create
    rate_limit_error = check_rate_limit
    return render json: { error: rate_limit_error }, status: :too_many_requests if rate_limit_error

    entry = self.class::MODEL.new(entry_params)
    entry.account = current_account
    entry.image_media_ids = validated_media_ids
    entry.status = auto_approve? ? :approved : :pending

    if entry.save
      invalidate_list_cache
      CommunityDirectoryMailer.entry_submitted(entry, self.class::CATEGORY_KEY).deliver_later unless entry.approved?
      CommunityTranslationWorker.perform_async(entry.class.name, entry.id)
      CommunityEntryNotifyWorker.perform_async('new_entry', entry.class.name, entry.id, self.class::CATEGORY_KEY) if entry.approved?
      render json: serialize(entry, detail: true), status: :created
    else
      render json: { errors: entry.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    @entry.image_media_ids = validated_media_ids if params.key?(:media_ids)
    if @entry.update(entry_params)
      invalidate_list_cache
      CommunityTranslationWorker.perform_async(@entry.class.name, @entry.id)
      render json: serialize(@entry, detail: true)
    else
      render json: { errors: @entry.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @entry.destroy!
    invalidate_list_cache
    head :no_content
  end

  private

  def set_entry
    @entry = self.class::MODEL.find(params[:id])
  end

  def authorize_owner!
    return if @entry.account_id == current_account&.id
    return if current_user&.can?(:administrator)
    return if steward?
    render json: { error: 'Forbidden' }, status: :forbidden
  end

  def steward?
    CommunityDirectoryPermission.exists?(account: current_account, category_key: self.class::CATEGORY_KEY, is_steward: true)
  end

  def trusted?
    CommunityDirectoryPermission.exists?(account: current_account, trusted: true, category_key: nil) ||
      CommunityDirectoryPermission.exists?(account: current_account, trusted: true, category_key: self.class::CATEGORY_KEY)
  end

  def auto_approve?
    return true if current_user&.can?(:administrator)
    return true if trusted?
    setting = CommunityDirectoryCategorySetting.find_by(category_key: self.class::CATEGORY_KEY)
    setting&.requires_approval == false
  end

  def check_rate_limit
    setting = CommunityDirectoryCategorySetting.find_by(category_key: self.class::CATEGORY_KEY)
    return nil unless setting&.max_entries_per_account.present?
    return nil if auto_approve?

    window = setting.period_days.present? ? setting.period_days.days.ago : 30.days.ago
    count = self.class::MODEL.where(account: current_account, created_at: window..).count
    count >= setting.max_entries_per_account ? "Entry limit reached: #{setting.max_entries_per_account} per #{setting.period_days || 30} days." : nil
  end

  def image_data_for(entry)
    return [] unless Array(entry.image_media_ids).any?
    MediaAttachment.where(id: entry.image_media_ids)
                   .filter_map do |ma|
                     original = attachment_url(ma, :original)
                     next if original.blank?
                     { original: original, preview: attachment_url(ma, :small) || original }
                   end
  rescue StandardError
    []
  end

  def attachment_url(ma, style)
    raw = style == :original && ma.remote_url.present? ? ma.remote_url : ma.file.url(style)
    return nil if raw.blank?
    raw.start_with?('http') ? raw : "#{request.base_url}#{raw}"
  rescue StandardError
    nil
  end

  # Overridden by Events (capped at 2 -- see its own comment).
  def max_media_ids
    3
  end

  def validated_media_ids
    ids = Array(params[:media_ids]).reject(&:blank?).first(max_media_ids).map(&:to_i).select(&:positive?)
    MediaAttachment.where(id: ids, account: current_account).pluck(:id)
  end

  # Shared skeleton every category's serialize wraps: account/image fields
  # plus timestamps. Each controller's own `serialize` merges its
  # category-specific fields on top of this and calls `translations_for`
  # for the detail-view-only translations block.
  def base_entry_fields(e)
    imgs = image_data_for(e)
    {
      id: e.id, account_id: e.account_id.to_s, status: e.status,
      account: { id: e.account.id.to_s, username: e.account.username,
                 display_name: e.account.display_name, avatar: e.account.avatar_original_url,
                 avatar_static: e.account.avatar_static_url },
      images:          imgs.map { |i| i[:original] },
      image_previews:  imgs.map { |i| i[:preview] },
      image_media_ids: e.image_media_ids,
      created_at:      e.created_at.iso8601,
      updated_at:      e.updated_at.iso8601,
    }
  end

  def translations_for(e)
    CommunityEntryTranslation
      .where(translatable_type: e.class.name, translatable_id: e.id)
      .each_with_object({}) { |t, h| (h[t.locale] ||= {})[t.field_name] = t.translated_text }
  end
end
