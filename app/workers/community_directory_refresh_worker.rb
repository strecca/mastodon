# frozen_string_literal: true

# Publishes a refresh signal to every client subscribed to a community
# channel (e.g. 'community:listings'). Clients respond by refetching.
#
# Call CommunityDirectoryRefreshWorker.schedule(channel) after any write. The
# 30-second delay lets translations and caches settle first, and the
# per-channel lock collapses a burst of writes (a scraper importing 50 events)
# into one push.
class CommunityDirectoryRefreshWorker
  include Sidekiq::Worker
  include Redisable
  extend Redisable

  DELAY = 30.seconds

  sidekiq_options retry: 3, queue: 'default'

  def self.schedule(channel)
    return unless redis.set("community_refresh_pending:#{channel}", '1', nx: true, ex: DELAY.to_i + 5)

    perform_in(DELAY, channel)
  end

  def perform(channel)
    redis.del("community_refresh_pending:#{channel}")
    # The streaming server silently drops any message without a `payload`
    # (streaming/index.js listener: `if (!message?.event || !message?.payload) return`),
    # so the bare { event: 'refresh' } sent until 2026-11-24 never reached a client.
    # The client only checks `event`; the payload just has to be present.
    redis.publish("timeline:#{channel}", { event: 'refresh', payload: channel }.to_json)
  end
end
