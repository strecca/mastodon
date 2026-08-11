# frozen_string_literal: true

class CommunityEntryNotificationMailer < ApplicationMailer
  # Digest email — sent by Scheduler::MemberNotificationFlushScheduler.
  # Receives a pre-loaded array of CommunityEntryNotification rows for one
  # recipient, batching across whichever categories/senders fired for them.
  def digest(recipient, notifications)
    @recipient     = recipient
    @notifications = notifications

    user = User.find_by(account: @recipient)
    return unless user&.email.present?

    total = notifications.size
    locale_for_account(@recipient) do
      mail(
        to:      user.email,
        subject: "#{total} new community update#{total == 1 ? '' : 's'} waiting for you"
      )
    end
  end
end
