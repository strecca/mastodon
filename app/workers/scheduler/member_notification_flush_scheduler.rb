# frozen_string_literal: true

# Runs every 15 minutes via Sidekiq-scheduler.
#
# Push: delivers CommunityEntryNotification rows that were held back because
# the recipient was in their quiet-hours window when the notification was
# created — sends as soon as they're no longer in that window.
#
# Email: 'immediate' accounts are flushed every tick (near real-time);
# 'digest' accounts are flushed once per DAILY_CUTOFF, mirroring
# Scheduler::CommunityVisitDigestScheduler's cutoff pattern; 'never' accounts
# are excluded from the query entirely.
class Scheduler::MemberNotificationFlushScheduler
  include Sidekiq::Worker

  sidekiq_options retry: 0, lock: :until_executed, lock_ttl: 15.minutes.to_i, queue: 'scheduler'

  DAILY_CUTOFF = 24.hours

  def perform
    flush_deferred_push
    flush_email
  end

  private

  def flush_deferred_push
    CommunityEntryNotification.needs_push.find_each do |notification|
      preference = MemberNotificationPreference.for_account(notification.recipient)
      next if preference.in_quiet_hours?

      CommunityEntryPushWorker.perform_async(notification.id)
    end
  end

  def flush_email
    recipient_ids = CommunityEntryNotification
      .needs_email
      .joins(
        'INNER JOIN member_notification_preferences mnp ON mnp.account_id = community_entry_notifications.recipient_account_id'
      )
      .where('mnp.email_frequency IN (1, 2)') # 1=immediate, 2=digest
      .distinct
      .pluck(:recipient_account_id)

    recipient_ids.each { |id| process_account_email(id) }
  end

  def process_account_email(account_id)
    preference = MemberNotificationPreference.find_by(account_id: account_id)
    return unless preference

    if preference.digest?
      last_sent = CommunityEntryNotification
        .where(recipient_account_id: account_id)
        .where.not(emailed_at: nil)
        .maximum(:emailed_at)
      return if last_sent.present? && last_sent > DAILY_CUTOFF.ago
    end

    notifications = CommunityEntryNotification
      .includes(:sender)
      .where(recipient_account_id: account_id, emailed_at: nil)
      .order(created_at: :asc)
    return if notifications.empty?

    account = Account.find_by(id: account_id)
    return unless account

    CommunityEntryNotificationMailer.digest(account, notifications.to_a).deliver_now
    notifications.update_all(emailed_at: Time.current)
  rescue StandardError => e
    Rails.logger.error("[MemberNotificationFlush] Error for account #{account_id}: #{e.message}")
  end
end
