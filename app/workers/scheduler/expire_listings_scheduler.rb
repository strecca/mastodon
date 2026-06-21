# frozen_string_literal: true

# Runs nightly. Closes open community listings whose expires_at has passed.
class Scheduler::ExpireListingsScheduler
  include Sidekiq::Worker

  sidekiq_options retry: 0, lock: :until_executed, lock_ttl: 1.day.to_i, queue: 'scheduler'

  def perform
    expired = CommunityListing.open.where('expires_at < ?', Time.current)
    count   = expired.count
    return if count.zero?

    expired.update_all(status: CommunityListing.statuses[:closed])
    Rails.logger.info("[ExpireListings] Closed #{count} expired listing(s)")
  end
end
