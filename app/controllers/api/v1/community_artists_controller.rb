class Api::V1::CommunityArtistsController < Api::BaseController
  CATEGORY_KEY = 'artists'

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
    entries = CommunityArtist.includes(:account).search(params[:q])
                .where(status: :approved)
                .order(sort_col => sort_dir)
                .page(params[:page]).per(params[:per_page] || 20)
    render json: { entries: entries.map { |e| serialize(e) },
                   total: entries.total_count, page: entries.current_page, pages: entries.total_pages }
  end

  def show
    render json: serialize(@entry)
  end

  def create
    rate_limit_error = check_rate_limit
    return render json: { error: rate_limit_error }, status: :too_many_requests if rate_limit_error

    entry = CommunityArtist.new(entry_params)
    entry.account = current_account
    entry.status  = auto_approve? ? :approved : :pending

    if entry.save
      CommunityDirectoryMailer.entry_submitted(entry, CATEGORY_KEY).deliver_later unless entry.approved?
      CommunityTranslationWorker.perform_async(entry.class.name, entry.id)
      render json: serialize(entry), status: :created
    else
      render json: { errors: entry.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @entry.update(entry_params)
      CommunityTranslationWorker.perform_async(@entry.class.name, @entry.id)
      render json: serialize(@entry)
    else
      render json: { errors: @entry.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @entry.destroy!
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
    return nil if auto_approve? # trusted/admin bypass rate limit

    window = setting.period_days.present? ? setting.period_days.days.ago : 30.days.ago
    count = CommunityArtist.where(account: current_account, created_at: window..).count
    count >= setting.max_entries_per_account ? "Entry limit reached: #{setting.max_entries_per_account} per #{setting.period_days || 30} days." : nil
  end

  def entry_params
    p = params.require(:entry).permit(:category, :location_town_city, :first_name, :last_name, :artist_description, :hours_schedule, :contact_info_1, :contact_info_2, :website, :telephone)
    p[:category] = params[:entry][:category] if params[:entry][:category].is_a?(Array)
    p
  end

  def serialize(e)
    translations = CommunityEntryTranslation
      .where(translatable_type: e.class.name, translatable_id: e.id)
      .each_with_object({}) do |t, h|
        (h[t.locale] ||= {})[t.field_name] = t.translated_text
      end

    { id: e.id, account_id: e.account_id, status: e.status,
      account: { id: e.account.id, username: e.account.username,
                 display_name: e.account.display_name, avatar: e.account.avatar_original_url },
      category: e.category,
      location_town_city: e.location_town_city,
      first_name: e.first_name,
      last_name: e.last_name,
      artist_description: e.artist_description,
      hours_schedule: e.hours_schedule,
      contact_info_1: e.contact_info_1,
      contact_info_2: e.contact_info_2,
      website: e.website,
      telephone: e.telephone,
      translations: translations,
      created_at: e.created_at.iso8601, updated_at: e.updated_at.iso8601 }
  end
end
