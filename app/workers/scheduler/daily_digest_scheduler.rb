# frozen_string_literal: true

# Runs daily at 05:00 UTC (07:00 Italy time) via sidekiq.yml scheduler.
# Generates an AI newspaper digest from the day's upcoming scraped events.

class Scheduler::DailyDigestScheduler
  include Sidekiq::Worker

  sidekiq_options retry: 0, lock: :until_executed, lock_ttl: 1.hour.to_i, queue: 'scheduler'

  def perform
    digest = DailyDigestService.new.generate(date: Date.today)
    if digest
      Rails.logger.info('[DailyDigest] Digest generated successfully')
    else
      Rails.logger.info('[DailyDigest] Skipped -- nothing to report today')
    end
  end
end
