# frozen_string_literal: true

class CommunityVisitsMailer < ApplicationMailer
  # Sent immediately when an overlap_detected or friend_ping notification is created
  # and the recipient's email_frequency is :immediate.
  def overlap_notification(notification)
    @notification = notification
    @recipient    = notification.recipient
    @sender       = notification.sender
    @visit        = notification.visit

    user = User.find_by(account: @recipient)
    return unless user&.email.present?

    locale_for_account(@recipient) do
      mail(
        to:      user.email,
        subject: "#{@sender.display_name.presence || "@#{@sender.username}"} will also be in town — visit overlap detected"
      )
    end
  end

  def friend_ping(notification)
    @notification = notification
    @recipient    = notification.recipient
    @sender       = notification.sender
    @visit        = notification.visit
    @message      = notification.message

    user = User.find_by(account: @recipient)
    return unless user&.email.present?

    locale_for_account(@recipient) do
      mail(
        to:      user.email,
        subject: "#{@sender.display_name.presence || "@#{@sender.username}"} wants to connect during your visit"
      )
    end
  end

  # Digest email — sent by the scheduler. Receives a pre-loaded array of notifications.
  def digest(recipient, notifications)
    @recipient     = recipient
    @notifications = notifications
    @overlap_count = notifications.count { |n| n.kind == 'overlap_detected' }
    @ping_count    = notifications.count { |n| n.kind == 'friend_ping' }

    user = User.find_by(account: @recipient)
    return unless user&.email.present?

    total = notifications.size
    locale_for_account(@recipient) do
      mail(
        to:      user.email,
        subject: "#{total} community visit #{total == 1 ? 'update' : 'updates'} waiting for you"
      )
    end
  end
end
