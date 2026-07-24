class Api::V1::CommunityArtistsController < Api::BaseController
  CATEGORY_KEY = 'artists'

  include CommunityCacheable

  skip_before_action :require_authenticated_user!, only: [:index, :show]

  before_action :require_user!, only: [:create, :update, :destroy]
  before_action :set_entry, only: [:show, :update, :destroy]
  before_action :authorize_owner!, only: [:update, :destroy]

  def index
    sort_col, sort_dir = case params[:sort]
                         when 'oldest'  then [:created_at, :asc]
                         when 'az'      then [:first_name, :asc]
                         when 'updated' then [:updated_at, :desc]
                         else                [:created_at, :desc]
                         end

    result = cached_list do
      entries = CommunityArtist.includes(:account)
                               .search(params[:q])
                               .where(status: :approved)
                               .order(sort_col => sort_dir)
                               .select(*list_columns)
                               .page(params[:page]).per(params[:per_page] || 20)

      { entries: entries.map { |e| serialize(e, detail: false) },
        total: entries.total_count, page: entries.current_page, pages: entries.total_pages }
    end

    inject_list_translations(result, 'CommunityArtist')
    render json: result
  end

  def show
    render json: serialize(@entry, detail: true)
  end

  def create
    rate_limit_error = check_rate_limit
    return render json: { error: rate_limit_error }, status: :too_many_requests if rate_limit_error

    entry = CommunityArtist.new(entry_params)
    entry.account = current_account
    entry.image_media_ids = validated_media_ids
    entry.status  = auto_approve? ? :approved : :pending

    if entry.save
      invalidate_list_cache
      CommunityDirectoryMailer.entry_submitted(entry, CATEGORY_KEY).deliver_later unless entry.approved?
      CommunityTranslationWorker.perform_async(entry.class.name, entry.id)
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
    @entry = CommunityArtist.find(params[:id])
  end

  def authorize_owner!
    return if @entry.account_id == current_account&.id
    return if current_user&.can?(:administrator)
    return if steward?
    render json: { error: 'Forbidden' }, status: :forbidden
  end

  def steward?
    CommunityDirectoryPermission.exists?(account: current_account, category_key: CATEGORY_KEY, is_steward: true)
  end

  def trusted?
    CommunityDirectoryPermission.exists?(account: current_account, trusted: true, category_key: nil) ||
      CommunityDirectoryPermission.exists?(account: current_account, trusted: true, category_key: CATEGORY_KEY)
  end

  def auto_approve?
    return true if current_user&.can?(:administrator)
    return true if trusted?
    setting = CommunityDirectoryCategorySetting.find_by(category_key: CATEGORY_KEY)
    setting&.requires_approval == false
  end

  def check_rate_limit
    setting = CommunityDirectoryCategorySetting.find_by(category_key: CATEGORY_KEY)
    return nil unless setting&.max_entries_per_account.present?
    return nil if auto_approve?

    window = setting.period_days.present? ? setting.period_days.days.ago : 30.days.ago
    count = CommunityArtist.where(account: current_account, created_at: window..).count
    count >= setting.max_entries_per_account ? "Entry limit reached: #{setting.max_entries_per_account} per #{setting.period_days || 30} days." : nil
  end

  def entry_params
    p = params.require(:entry).permit(:category, :location_town_city, :first_name, :last_name, :artist_description, :hours_schedule, :contact_info_1, :contact_info_2, :website, :telephone)
    p[:category] = params[:entry][:category] if params[:entry][:category].is_a?(Array)
    p
  end

  def list_columns
    super + [:image_media_ids]
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

  def validated_media_ids
    ids = Array(params[:media_ids]).reject(&:blank?).first(3).map(&:to_i).select(&:positive?)
    MediaAttachment.where(id: ids, account: current_account).pluck(:id)
  end

  def serialize(e, detail: true)
    imgs = image_data_for(e)
    base = {
      id: e.id, account_id: e.account_id.to_s, status: e.status,
      account: { id: e.account.id.to_s, username: e.account.username,
                 display_name: e.account.display_name, avatar: e.account.avatar_original_url,
                 avatar_static: e.account.avatar_static_url },
      images:             imgs.map { |i| i[:original] },
      image_previews:     imgs.map { |i| i[:preview] },
      image_media_ids:    e.image_media_ids,
      category:           e.category,
      location_town_city: e.location_town_city,
      first_name:         e.first_name,
      last_name:          e.last_name,
      telephone:          e.telephone,
      created_at:         e.created_at.iso8601,
      updated_at:         e.updated_at.iso8601,
    }

    return base unless detail

    translations = CommunityEntryTranslation
      .where(translatable_type: e.class.name, translatable_id: e.id)
      .each_with_object({}) { |t, h| (h[t.locale] ||= {})[t.field_name] = t.translated_text }

    base.merge(
      artist_description: e.artist_description,
      hours_schedule:     e.hours_schedule,
      contact_info_1:     e.contact_info_1,
      contact_info_2:     e.contact_info_2,
      website:            e.website,
      translations:       translations
    )
  end
end
