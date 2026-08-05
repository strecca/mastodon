# frozen_string_literal: true

class HomeController < ApplicationController
  include WebAppControllerConcern

  # Public content the SPA serves through this same catch-all route — these
  # get indexed. Everything else routed to home#index (settings, timelines,
  # notifications, admin tools, etc.) stays noindex, matching upstream intent.
  INDEXABLE_PREFIXES = %w[
    /landing /guide /daily /contact
    /community_artists /community_events /community_listings
    /community_services /community_restaurants /community_properties
    /newsletters /member_stories
  ].freeze

  def index
    expires_in(15.seconds, public: true, stale_while_revalidate: 30.seconds, stale_if_error: 60.seconds) unless user_signed_in?
  end

  def indexable_path?
    path = request.path
    path == '/' || INDEXABLE_PREFIXES.any? { |prefix| path == prefix || path.start_with?("#{prefix}/") }
  end
  helper_method :indexable_path?

  def community_og_preview
    CommunityOgPreview.new(request.base_url).for_path(request.path)
  end
  helper_method :community_og_preview
end
