# frozen_string_literal: true

class Api::V1::CommunityEntryNotificationsController < Api::BaseController
  before_action :require_user!

  # GET /api/v1/community_entry_notifications
  def index
    notifications = CommunityEntryNotification
      .for_recipient(current_account)
      .includes(:sender, :notifiable)
      .order(created_at: :desc)
      .page(params[:page]).per(20)

    render json: {
      notifications: notifications.map { |n| serialize(n) },
      total:         notifications.total_count,
      page:          notifications.current_page,
      pages:         notifications.total_pages,
      unread_count:  CommunityEntryNotification.for_recipient(current_account).unread.count,
    }
  end

  # GET /api/v1/community_entry_notifications/unread_count
  def unread_count
    count = CommunityEntryNotification.for_recipient(current_account).unread.count
    render json: { count: count }
  end

  # POST /api/v1/community_entry_notifications/:id/read
  def read
    notification = find_own_notification
    return render json: { error: 'Not found' }, status: :not_found unless notification

    notification.mark_read!
    render json: serialize(notification)
  end

  # POST /api/v1/community_entry_notifications/read_all
  def read_all
    CommunityEntryNotification
      .for_recipient(current_account)
      .unread
      .update_all(read_at: Time.current)

    render json: { success: true }
  end

  # POST /api/v1/community_entry_notifications/:id/mute
  # "Stop notifications like this" — removes whichever subscription caused
  # this specific notification, rather than a blanket unsubscribe.
  def mute
    notification = find_own_notification
    return render json: { error: 'Not found' }, status: :not_found unless notification

    if notification.entry_response?
      CommunityEntryWatch.where(account_id: current_account.id, watchable: notification.notifiable).destroy_all
    else
      MemberNotificationCategorySubscription
        .where(account_id: current_account.id, category_key: notification.category_key)
        .destroy_all
      if notification.sender_account_id
        MemberNotificationTarget
          .where(account_id: current_account.id, target_account_id: notification.sender_account_id)
          .destroy_all
      end
    end

    render json: { success: true }
  end

  private

  def find_own_notification
    CommunityEntryNotification.find_by(id: params[:id], recipient_account_id: current_account.id)
  end

  def serialize(n)
    {
      id:                    n.id,
      kind:                  n.kind,
      category_key:          n.category_key,
      category_display_name: CommunityDirectoryConfig.display_name_for(n.category_key),
      read:                  n.read?,
      created_at:            n.created_at.iso8601,
      sender:                n.sender ? serialize_account(n.sender) : nil,
      url:                   "/community_#{n.category_key}/#{n.notifiable_id}",
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
end
