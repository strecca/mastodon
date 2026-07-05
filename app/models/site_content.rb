# frozen_string_literal: true

class SiteContent < ApplicationRecord
  validates :key,    presence: true
  validates :locale, presence: true
  validates :key,    uniqueness: { scope: :locale }

  # Returns value for a single key, falling back to English if locale not found
  def self.for(key, locale: 'en', fallback: '')
    locale = locale.to_s.split('-').first  # 'it-IT' → 'it'
    record = find_by(key: key, locale: locale)
    record ||= find_by(key: key, locale: 'en') if locale != 'en'
    record&.value.presence || fallback
  end

  # Returns { key => value } hash for all keys in a locale, falling back to English
  def self.bulk_for(locale: 'en')
    locale = locale.to_s.split('-').first
    en_rows = where(locale: 'en').pluck(:key, :value).to_h
    return en_rows if locale == 'en'

    locale_rows = where(locale: locale).pluck(:key, :value).to_h
    en_rows.merge(locale_rows)
  end

  # Upsert a single key/locale value
  def self.set(key, value, locale: 'en', content_type: 'text')
    record = find_or_initialize_by(key: key, locale: locale)
    record.update!(value: value, content_type: content_type)
    record
  end

  SEED_EN = {
    # ── Landing page: hero ──
    'landing_logo_text'       => 'Civezza Community Directory',
    'landing_hero_tagline'    => 'Explore everything our community has to offer',
    'landing_see_posts_btn'   => 'See Community Posts',
    'landing_login_link'      => 'Log in →',

    # ── Landing page: join CTA ──
    'landing_join_heading'    => 'Join the MiaCivezza.com Community',
    'landing_join_feature_1'  => 'Make your own posts, add Civezza Community Events, Favorite Restaurants, and list items for Sale, Giveaway, Trade or Searching For — plus Properties for Sale, Rent or short-term Vacation stays.',
    'landing_join_feature_2'  => 'In the Community Services section, share your skills or recommend Builders, Architects, Craftspeople, Cooks, Cleaning services, Property Management, and guidance on permits, regulations, and local contacts.',
    'landing_join_feature_3'  => "Post When I'll Be In Town to privately share the dates you'll be returning to Civezza or the Imperia area — and let Members know you'd love to connect while you're back in Italy.",
    'landing_join_footer'     => 'Registration is Free. No Credit Card required. Come Join us!',
    'landing_create_account'  => 'Create Account',

    # ── Landing page: tile labels & descriptions ──
    'tile_listings_label'     => 'Community Listings',
    'tile_listings_desc'      => 'Giveaway · Trade · Sell · ISO',
    'tile_events_label'       => 'Community Events',
    'tile_events_desc'        => "What's happening nearby",
    'tile_properties_label'   => 'Community Properties',
    'tile_properties_desc'    => 'Houses · Apartments · Rentals',
    'tile_services_label'     => 'Community Services',
    'tile_services_desc'      => 'Local businesses & services',
    'tile_restaurants_label'  => 'Community Restaurants',
    'tile_restaurants_desc'   => 'Dining · Cafés · Trattorias',
    'tile_artists_label'      => 'Community Artists',
    'tile_artists_desc'       => 'Local talent & creatives',
    'tile_visits_label'       => "Community When I'm In Town",
    'tile_visits_desc'        => "See who's visiting · Share your dates",
    'tile_stories_label'      => 'Member Stories',
    'tile_stories_desc'       => 'Personal histories · Civezza connections',

    # ── About page ──
    'about_cta'               => 'Click this image to see MiaCivezza.com in action!',
    'about_bio_p1'            => “MiaCivezza.com is my attempt to provide an online Community Bulletin Board and Piazzetta meeting plaza. My Wife & I would meet people at dinner or aperitivo time or at artistic or musical events, make friends and then say Goodbye and want to stay in contact with them. We'd try to exchange contact information as the last process of saying “We hope to see you again”.”,
    'about_bio_p2'            => 'Now Visitors and Residents have immediate access to contact each other to renew friendships and to reunite.',
    'about_photo_url'         => '',

    # ── Server banner (home feed left panel) ──
    'server_hero_cta'         => 'Click this image to see MiaCivezza.com in action!',

    # ── Category page column header titles ──
    'col_listings_title'      => 'Community Listings',
    'col_events_title'        => 'Community Events',
    'col_properties_title'    => 'Community Properties',
    'col_services_title'      => 'Community Services',
    'col_restaurants_title'   => 'Community Restaurants',
    'col_artists_title'       => 'Community Artists',
    'col_visits_title'        => "When I'll Be In Town",
    'col_stories_title'       => 'Member Stories',

    # ── Login page ──
    'login_title'             => 'Sign in to miacivezza.com',
    'login_preamble'          => 'Welcome to the Civezza community. Log in with your email address and password.',
  }.freeze

  def self.seed!
    SEED_EN.each do |key, value|
      find_or_create_by!(key: key, locale: 'en') do |r|
        r.value        = value
        r.content_type = 'text'
      end
    end
  end
end
