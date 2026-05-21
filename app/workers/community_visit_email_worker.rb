# frozen_string_literal: true

# Delivers a single community visit notification email immediately.
# Only fires when the recipient's email_frequency is :immediate.
# Called from the controller (notify_friends) and CommunityVisitOverlapWorker.
class CommunityVisitEmailWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'mailers', retry: 3

  def perform(notification_id)
    notification = CommunityVisitNotification
      .includes(:recipient, :sender, :visit)
      .find_by(id: notification_id)
    return unless notification

    pref = CommunityNotificationPreference.for_account(notification.recipient)
    return unless pref.email_frequency == 'immediate'

    # Skip if already emailed
    return if notification.emailed_at.present?

    case notification.kind
    when 'overlap_detected'
      CommunityVisitsMailer.overlap_notification(notification).deliver_now
    when 'friend_ping'
      CommunityVisitsMailer.friend_ping(notification).deliver_now
    end

    notification.update_column(:emailed_at, Time.current)
  end
end
