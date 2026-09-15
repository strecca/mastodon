# frozen_string_literal: true

# Fired once, right after a new member registers. Announces them to every
# other confirmed member (except demo_* seed accounts), respecting each
# recipient's notification_emails.new_member opt-out.

class NewMemberAnnouncementWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'mailers', retry: 3

  def perform(new_user_id)
    new_user = User.find_by(id: new_user_id)
    return unless new_user&.account

    new_account = new_user.account

    existing_members = User.confirmed
                            .joins(:account)
                            .where(accounts: { suspended_at: nil })
                            .where.not(id: new_user.id)
                            .where.not('accounts.username LIKE ?', 'demo\_%')
                            .includes(:account)

    return if existing_members.empty?

    other_usernames = existing_members.map { |u| u.account.username }.sort

    existing_members.each do |recipient|
      next unless recipient.settings.notification_emails.new_member

      NewMemberAnnouncementMailer.announce(recipient, new_account, other_usernames).deliver_now
    end
  end
end
