# frozen_string_literal: true

class Api::V1::CommunityVisitNotificationsController < Api::BaseController
  before_action :require_user!

  # GET /api/v1/community_visit_notifications
  def index
    notifications = CommunityVisitNotification
      .for_recipient(current_account)
      .includes(:sender, :visit)
      .order(created_at: :desc)
      .page(params[:page]).per(20)

    render json: {
      notifications: notifications.map { |n| serialize(n) },
      total:         notifications.total_count,
      page:          notifications.current_page,
      pages:         notifications.total_pages,
      unread_count:  CommunityVisitNotification.for_recipient(current_account).unread.count,
    }
  end

  # GET /api/v1/community_visit_notifications/unread_count
  def unread_count
    count = CommunityVisitNotification.for_recipient(current_account).unread.count
    render json: { count: count }
  end

  # POST /api/v1/community_visit_notifications/:id/read
  def read
    notification = CommunityVisitNotification.find_by(
      id:                   params[:id],
      recipient_account_id: current_account.id
    )
    return render json: { error: 'Not found' }, status: :not_found unless notification

    notification.mark_read!
    render json: serialize(notification)
  end

  # POST /api/v1/community_visit_notifications/read_all
  def read_all
    CommunityVisitNotification
      .for_recipient(current_account)
      .unread
      .update_all(read_at: Time.current)

    render json: { success: true }
  end

  private

  def serialize(n)
    {
      id:         n.id,
      kind:       n.kind,
      message:    n.message,
      read:       n.read?,
      created_at: n.created_at.iso8601,
      sender:     n.sender ? serialize_account(n.sender) : nil,
      visit:      n.visit  ? serialize_visit_stub(n.visit) : nil,
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

  def serialize_visit_stub(visit)
    {
      id:             visit.id,
      arrival_date:   visit.arrival_date.iso8601,
      departure_date: visit.departure_date.iso8601,
    }
  end
end
