class Api::V1::CommunityEventsController < Api::BaseController
  CATEGORY_KEY = 'events'

  include CommunityCacheable

  skip_before_action :require_authenticated_user!, only: [:index, :show]

  before_action :require_user!, only: [:create, :update, :destroy]
  before_action :set_entry, only: [:show, :update, :destroy]
  before_action :authorize_owner!, only: [:update, :destroy]

  def index
    sort_col, sort_dir = case params[:sort]
                         when 'past'    then [:event_date, :desc]
                         when 'newest'  then [:created_at, :desc]
                         when 'az'      then [:event_name, :asc]
                         else                [:event_date, :asc]
                         end

    result = cached_list do
      entries = CommunityEvent.includes(:account)
                              .search(params[:q])
                              .where(status: :approved)
                              .order(sort_col => sort_dir)
                              .select(*list_columns)
                              .page(params[:page]).per(params[:per_page] || 20)

      { entries: entries.map { |e| serialize(e, detail: false) },
        total: entries.total_count, page: entries.current_page, pages: entries.total_pages }
    end

    render json: result
  end

  def show
    render json: serialize(@entry, detail: true)
  end

  def create
    rate_limit_error = check_rate_limit
    return render json: { error: rate_limit_error }, status: :too_many_requests if rate_limit_error

    entry = CommunityEvent.new(entry_params)
    entry.account = current_account
    entry.status  = auto_approve? ? :approved : :pending

    if entry.save
      invalidate_list_cache
      CommunityDirectoryMailer.entry_submitted(entry, CATEGORY_KEY).deliver_later unless entry.approved?
      CommunityTranslationWorker.perform_async(entry.class.name, entry.id)
      CommunityDirectoryRefreshWorker.perform_in(30.seconds, 'community:events') if entry.approved?
      render json: serialize(entry, detail: true), status: :created
    else
      render json: { errors: entry.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @entry.update(entry_params)
      invalidate_list_cache
      CommunityTranslationWorker.perform_async(@entry.class.name, @entry.id)
      CommunityDirectoryRefreshWorker.perform_in(30.seconds, 'community:events')
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
    @entry = CommunityEvent.find(params[:id])
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
    count = CommunityEvent.where(account: current_account, created_at: window..).count
    count >= setting.max_entries_per_account ? "Entry limit reached: #{setting.max_entries_per_account} per #{setting.period_days || 30} days." : nil
  end

  def entry_params
    params.require(:entry).permit(:event_name, :event_description, :event_date,
                                  :location_town_city, :contact_info_1, :contact_info_2,
                                  :website, :telephone, category: [])
  end

  def serialize(e, detail: true)
    base = {
      id: e.id, account_id: e.account_id, status: e.status,
      account: { id: e.account.id, username: e.account.username,
                 display_name: e.account.display_name, avatar: e.account.avatar_original_url },
      category:           e.category,
      event_name:         e.event_name,
      event_date:         e.event_date&.iso8601,
      location_town_city: e.location_town_city,
      created_at:         e.created_at.iso8601,
      updated_at:         e.updated_at.iso8601,
    }

    return base unless detail

    translations = CommunityEntryTranslation
      .where(translatable_type: e.class.name, translatable_id: e.id)
      .each_with_object({}) { |t, h| (h[t.locale] ||= {})[t.field_name] = t.translated_text }

    base.merge(
      event_description: e.event_description,
      end_date:          e.end_date&.iso8601,
      contact_info_1:    e.contact_info_1,
      contact_info_2:    e.contact_info_2,
      website:           e.website,
      telephone:         e.telephone,
      source_url:        e.source_url,
      source_name:       e.source_name,
      auto_imported:     e.auto_imported,
      translations:      translations
    )
  end
end
