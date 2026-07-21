# frozen_string_literal: true

# Dynamic sitemap.xml covering the site's public, indexable content —
# see HomeController::INDEXABLE_PREFIXES for the same allowlist used to
# decide what gets a <meta name="robots"> noindex tag. Cached briefly since
# entry counts are small (dozens, not millions) and change infrequently.
class SitemapsController < ApplicationController
  STATIC_PATHS = %w[
    / /landing /guide /daily /contact
    /community_artists /community_events /community_listings
    /community_services /community_restaurants /community_properties
    /newsletters /member_stories
  ].freeze

  CATEGORY_MODELS = {
    'community_artists'     => CommunityArtist,
    'community_events'      => CommunityEvent,
    'community_properties'  => CommunityProperty,
    'community_restaurants' => CommunityRestaurant,
    'community_services'    => CommunityService,
  }.freeze

  def index
    expires_in(1.hour, public: true)
    @urls = Rails.cache.fetch('sitemap:urls', expires_in: 1.hour) { build_urls }
    render layout: false
  end

  private

  def build_urls
    urls = STATIC_PATHS.map { |path| { loc: url_for_path(path), lastmod: nil } }

    CATEGORY_MODELS.each do |prefix, model|
      model.approved.select(:id, :updated_at).find_each do |record|
        urls << { loc: url_for_path("/#{prefix}/#{record.id}"), lastmod: record.updated_at }
      end
    end

    CommunityListing.select(:id, :updated_at).find_each do |record|
      urls << { loc: url_for_path("/community_listings/#{record.id}"), lastmod: record.updated_at }
    end

    CommunityNewsletter.published.select(:id, :slug, :updated_at).find_each do |record|
      urls << { loc: url_for_path("/newsletters/#{record.slug}"), lastmod: record.updated_at }
    end

    urls
  end

  def url_for_path(path)
    "#{request.base_url}#{path.presence || '/'}"
  end
end
