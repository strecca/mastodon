# frozen_string_literal: true

class Api::V1::CommunityVisitsController < Api::BaseController
  before_action :require_user!, except: [:heatmap]
  before_action :set_visit,     only: [:show, :update, :destroy, :notify_friends]
  before_action :authorize_owner!, only: [:update, :destroy, :notify_friends]

  # GET /api/v1/community_visits?from=2026-06-01&to=2026-08-31
  # Returns all visible visits overlapping the requested date window.
  # Subscriber-only: ghost visits never appear; connections_only visits
  # are filtered to accounts in the current user's follow graph.
  def index
    from_date = parse_date(params[:from]) || Date.current.beginning_of_month
    to_date   = parse_date(params[:to])   || 12.months.from_now.end_of_month.to_date

    visits = visible_visits_in_range(from_date, to_date)

    account_ids      = visits.map(&:account_id).uniq
    relationship_map = build_relationship_map(account_ids)

    render json: visits.map { |v| serialize_visit(v, relationship_map) }
  end

  # GET /api/v1/community_visits/mine
  # Current user's own visits across the 18-month view window, regardless of visibility.
  def mine
    window_start = 6.months.ago.beginning_of_month.to_date
    visits = CommunityVisit
      .for_account(current_account)
      .where('departure_date >= ?', window_start)
      .includes(:visit_availabilities)
      .order(arrival_date: :asc)

    render json: visits.map { |v| serialize_visit(v) }
  end

  # GET /api/v1/community_visits/heatmap
  # Public endpoint. Returns { "YYYY-MM" => count } for the 18-month window.
  # Only counts public_to_members arrivals — safe for unauthenticated teasers.
  def heatmap
    window_start = 6.months.ago.beginning_of_month.to_date
    window_end   = 12.months.from_now.end_of_month.to_date

    counts = CommunityVisit
      .where(visibility: :public_to_members)
      .where('arrival_date <= ? AND departure_date >= ?', window_end, window_start)
      .group("TO_CHAR(arrival_date, 'YYYY-MM')")
      .count

    render json: counts
  end

  # GET /api/v1/community_visits/:id
  def show
    render json: serialize_visit(@visit, build_relationship_map([@visit.account_id]))
  end

  # POST /api/v1/community_visits
  def create
    visit = CommunityVisit.new(visit_params)
    visit.account = current_account

    ActiveRecord::Base.transaction do
      visit.save!
      sync_availabilities(visit, params[:availabilities])
    end

    CommunityVisitOverlapWorker.perform_async(visit.id)
    render json: serialize_visit(visit), status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
  end

  # PUT /api/v1/community_visits/:id
  def update
    ActiveRecord::Base.transaction do
      @visit.update!(visit_params)
      sync_availabilities(@visit, params[:availabilities])
    end

    CommunityVisitOverlapWorker.perform_async(@visit.id)
    render json: serialize_visit(@visit)
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
  end

  # DELETE /api/v1/community_visits/:id
  def destroy
    @visit.destroy!
    head :no_content
  end

  # POST /api/v1/community_visits/:id/notify_friends
  # Sends a friend_ping notification to up to 20 connected accounts.
  def notify_friends
    raw_ids = Array(params[:account_ids]).map(&:to_i).first(20).uniq
    return render json: { error: 'No accounts specified' }, status: :bad_request if raw_ids.empty?

    valid_ids = connected_subset(raw_ids)
    return render json: { error: 'None of those accounts are connections' }, status: :unprocessable_entity if valid_ids.empty?

    message = params[:message].presence&.truncate(140)
    notified = 0

    valid_ids.each do |recipient_id|
      # Don't re-ping if an unread ping for this exact visit already exists
      next if CommunityVisitNotification.exists?(
        recipient_account_id: recipient_id,
        community_visit_id:   @visit.id,
        kind:                 :friend_ping,
        read_at:              nil
      )

      CommunityVisitNotification.create!(
        recipient_account_id: recipient_id,
        sender_account_id:    current_account.id,
        community_visit_id:   @visit.id,
        kind:                 :friend_ping,
        message:              message
      )
      notified += 1
    end

    render json: { notified: notified }
  end

  private

  # ── Finders ───────────────────────────────────────────────────────────────

  def set_visit
    @visit = CommunityVisit.includes(:account, :visit_availabilities).find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Visit not found' }, status: :not_found
  end

  def authorize_owner!
    return if @visit.account_id == current_account.id
    return if current_user&.can?(:administrator)
    render json: { error: 'Forbidden' }, status: :forbidden
  end

  # ── Visibility-aware query ────────────────────────────────────────────────

  def visible_visits_in_range(from_date, to_date)
    base = CommunityVisit.overlapping(from_date, to_date)
                         .includes(:account, :visit_availabilities)

    public_visits = base.where(visibility: :public_to_members)

    # connections_only: visible to accounts in the current user's follow graph
    following_ids = Follow.where(account_id: current_account.id).pluck(:target_account_id)
    follower_ids  = Follow.where(target_account_id: current_account.id).pluck(:account_id)
    connected_ids = (following_ids | follower_ids)

    connections_visits = connected_ids.any? ? base.where(visibility: :connections_only, account_id: connected_ids) : CommunityVisit.none

    # Own visits at any visibility so the user sees their own ghost entries
    own_visits = base.where(account_id: current_account.id)

    (public_visits.to_a + connections_visits.to_a + own_visits.to_a).uniq(&:id)
                                                                     .sort_by(&:arrival_date)
  end

  # ── Availabilities ────────────────────────────────────────────────────────

  def sync_availabilities(visit, kinds)
    visit.visit_availabilities.destroy_all
    Array(kinds).map(&:to_s).uniq.each do |kind|
      next unless VisitAvailability.kinds.key?(kind)
      visit.visit_availabilities.create!(kind: kind)
    end
  end

  # ── Follow graph helpers ──────────────────────────────────────────────────

  # Returns a hash { account_id => 'mutual'|'following'|'follower'|'none' }
  def build_relationship_map(account_ids)
    return {} if account_ids.empty?

    ids = account_ids - [current_account.id]
    return {} if ids.empty?

    following_set = Follow.where(account_id: current_account.id, target_account_id: ids).pluck(:target_account_id).to_set
    follower_set  = Follow.where(account_id: ids, target_account_id: current_account.id).pluck(:account_id).to_set

    ids.each_with_object({}) do |aid, map|
      is_following = following_set.include?(aid)
      is_follower  = follower_set.include?(aid)
      map[aid] = if is_following && is_follower then 'mutual'
                 elsif is_following              then 'following'
                 elsif is_follower               then 'follower'
                 else                                 'none'
                 end
    end
  end

  # Returns the subset of account_ids that are in the current user's follow graph
  def connected_subset(account_ids)
    following_ids = Follow.where(account_id: current_account.id, target_account_id: account_ids).pluck(:target_account_id)
    follower_ids  = Follow.where(account_id: account_ids, target_account_id: current_account.id).pluck(:account_id)
    (following_ids | follower_ids) & account_ids
  end

  # ── Serializers ───────────────────────────────────────────────────────────

  def serialize_visit(visit, relationship_map = {})
    {
      id:             visit.id,
      account:        serialize_account(visit.account),
      arrival_date:   visit.arrival_date.iso8601,
      departure_date: visit.departure_date.iso8601,
      duration_days:  visit.duration_days,
      visibility:     visit.visibility,
      note:           visit.note,
      availabilities: visit.visit_availabilities.map(&:kind),
      relationship:   relationship_map[visit.account_id] || 'none',
      is_own:         visit.account_id == current_account&.id,
      active:         visit.active?,
      created_at:     visit.created_at.iso8601,
      updated_at:     visit.updated_at.iso8601,
    }
  end

  def serialize_account(account)
    {
      id:           account.id.to_s,
      username:     account.username,
      display_name: account.display_name,
      avatar:       account.avatar_original_url,
    }
  end

  # ── Params ────────────────────────────────────────────────────────────────

  def visit_params
    params.require(:visit).permit(:arrival_date, :departure_date, :visibility, :note)
  end

  def parse_date(value)
    value.present? ? Date.parse(value.to_s) : nil
  rescue Date::Error, ArgumentError
    nil
  end
end
