# frozen_string_literal: true

# Tells every connected client that a community page's data changed, after ANY
# create, update or destroy -- a member editing their own post, an admin
# deleting one, moderation, or a scraper -- so clients refetch and stay current.
#
#   include CommunityLiveRefresh
#   community_live_refresh 'listings'   # channel 'community:listings'
module CommunityLiveRefresh
  extend ActiveSupport::Concern

  class_methods do
    def community_live_refresh(channel_key)
      after_commit(on: %i(create update destroy)) do
        CommunityDirectoryRefreshWorker.schedule("community:#{channel_key}")
      end
    end
  end
end
