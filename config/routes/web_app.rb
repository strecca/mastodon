# frozen_string_literal: true

# Paths handled by the React application, which do not:
# - Require indexing
# - Have alternative format representations

%w(
  /blocks
  /bookmarks
  /collections/(*any)
  /conversations
  /deck/(*any)
  /directory
  /domain_blocks
  /explore/(*any)
  /favourites
  /follow_requests
  /followed_tags
  /getting-started
  /getting-started-misc
  /home
  /keyboard-shortcuts
  /links/(*any)
  /lists/(*any)
  /mutes
  /notifications_v2/(*any)
  /notifications/(*any)
  /pinned
  /profile/(*any)
  /public
  /public/local
  /public/remote
  /publish
  /search
  /start/(*any)
  /statuses/(*any)
  /community_directory
  /community_directory/scraper_logs
  /community_directory/(*any)
  /community_artists
  /community_artists/(*any)
  /community_listings
  /community_listings/(*any)
  /community_events
  /community_events/(*any)
  /community_visits
  /community_visits/admin
  /community_visits/notifications
  /landing
  /community_directory/landing-settings
  /community_directory/entries/(*any)
  /community_maintenance
  /community_services
  /community_services/(*any)
  /community_restaurants
  /community_restaurants/(*any)
  /community_properties
  /community_properties/(*any)
  /member_stories
  /member_stories/(*any)
  /contact
  /daily
).each { |path| get path, to: 'home#index' }

get '/community', to: redirect('/landing', status: 301)
