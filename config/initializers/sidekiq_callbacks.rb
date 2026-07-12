# frozen_string_literal: true

# Death handler fires when a Sidekiq job exhausts all retries and moves to
# the dead set. We alert on community-specific workers only — Mastodon's
# built-in schedulers failing is informational noise, not an ops alert.

SIDEKIQ_ALERTABLE_WORKERS = %w[
  CommunityTranslationWorker
  Scheduler::DailyDigestScheduler
  Scheduler::EventImportScheduler
].freeze

Sidekiq.configure_server do |config|
  config.death_handlers << lambda do |job, exception|
    next unless SIDEKIQ_ALERTABLE_WORKERS.include?(job['class'])

    AdminAlertMailer.job_died(job, exception).deliver_now
  rescue => e
    Rails.logger.error("[AdminAlert] Failed to deliver death alert: #{e.message}")
  end
end
