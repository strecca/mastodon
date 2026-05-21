# frozen_string_literal: true

# Runs every hour via Sidekiq-scheduler.
# Delivers digest emails for accounts with email_frequency: daily_digest or weekly_digest.
# Each notification is only emailed once (emailed_at guard). The scheduler
# decides whether a given account is "due" based on their frequency setting
# and the time of their most recent digest delivery.

class Scheduler::CommunityVisitDigestScheduler
  include Sidekiq::Worker

  sidekiq_options retry: 0, lock: :until_executed, lock_ttl: 2.hours.to_i, queue: 'scheduler'

  DAILY_CUTOFF  = 24.hours
  WEEKLY_CUTOFF = 7.days

  def perform
    # Only process accounts that have pending (unemailed) visit notifications
    # and a digest-style email preference.
    pending_recipient_ids = CommunityVisitNotification
      .where(emailed_at: nil)
      .where(kind: [:overlap_detected, :friend_ping])
      .joins(
        "INNER JOIN community_notification_preferences cnp ON cnp.account_id = community_visit_notifications.recipient_account_id"
      )
      .where("cnp.email_frequency IN (2, 3)") # 2=daily_digest, 3=weekly_digest
      .distinct
      .pluck(:recipient_account_id)

    return if pending_recipient_ids.empty?

    pending_recipient_ids.each { |id| process_account(id) }
  end

  private

  def process_account(account_id)
    pref = CommunityNotificationPreference.find_by(account_id: account_id)
    return unless pref

    cutoff = pref.email_frequency == 'daily_digest' ? DAILY_CUTOFF : WEEKLY_CUTOFF

    # Check if a digest was sent recently enough that we should hold off
    last_sent = CommunityVisitNotification
      .where(recipient_account_id: account_id)
      .where.not(emailed_at: nil)
      .maximum(:emailed_at)

    return if last_sent.present? && last_sent > cutoff.ago

    # Collect all unemailed digest-eligible notifications for this account
    notifications = CommunityVisitNotification
      .includes(:sender, :visit)
      .where(recipient_account_id: account_id, emailed_at: nil)
      .where(kind: [:overlap_detected, :friend_ping])
      .order(created_at: :asc)

    return if notifications.empty?

    account = Account.find_by(id: account_id)
    return unless account

    CommunityVisitsMailer.digest(account, notifications.to_a).deliver_now

    now = Time.current
    notifications.update_all(emailed_at: now)
  rescue StandardError => e
    Rails.logger.error("[CommunityVisitDigest] Error for account #{account_id}: #{e.message}")
  end
end
