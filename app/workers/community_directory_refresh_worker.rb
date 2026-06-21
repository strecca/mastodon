# frozen_string_literal: true

# Publishes a refresh signal to all clients subscribed to a community channel.
# Called 30 seconds after a listing or event is saved, giving time for any
# caches to settle before the push triggers a client refetch.
class CommunityDirectoryRefreshWorker
  include Sidekiq::Worker
  include Redisable

  sidekiq_options retry: 3, queue: 'default'

  def perform(channel)
    redis.publish("timeline:#{channel}", { event: 'refresh' }.to_json)
  end
end
