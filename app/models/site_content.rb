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
    'about_bio_p1'            => "MiaCivezza.com is my attempt to provide an online Community Bulletin Board and Piazzetta meeting plaza. My Wife & I would meet people at dinner or aperitivo time or at artistic or musical events, make friends and then say Goodbye and want to stay in contact with them. We'd try to exchange contact information as the last process of saying \"We hope to see you again\".",
    'about_bio_p2'            => 'Now Visitors and Residents have immediate access to contact each other to renew friendships and to reunite.',
    'about_photo_url'         => '',

    # ── Server banner (home feed left panel) ──
    'server_hero_cta'         => 'Click this image to see MiaCivezza.com in action!',
    'server_description'      => 'Civezza is a small community up in the hills overlooking the Ligurian coast in Imperia province. This website is a community bulletin board that also focuses on live User posts on most daily subjects.',

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

    # ── Join / Sign-up page ──
    'join_title'              => 'Welcome to miacivezza.com!',
    'join_tagline'            => "If you want all the benefits of miacivezza.com Membership, here's the place to start!",
    'join_benefits_heading'   => 'What you get as a Member:',
    'join_benefit_1_title'    => 'Add your own entries',
    'join_benefit_1_desc'     => 'to all Community categories — Services, Artists, Restaurants, Properties and more',
    'join_benefit_2_title'    => 'Make your own posts',
    'join_benefit_2_desc'     => 'and connect with neighbours in the community feed',
    'join_benefit_3_title'    => "Use the When I'll Be In Town",
    'join_benefit_3_desc'     => 'calendar to coordinate visits with friends',
    'join_benefit_4_title'    => "It's completely Free",
    'join_benefit_4_desc'     => '— no credit card, no subscription, no catch',
    'join_cta_note'           => 'Sign up as an authorized Member in just a few seconds. All we need is a username, email address and password.',
    'join_signup_btn'         => 'Sign Up Free',
    'join_signin_note'        => 'Already have an account?',
    'join_signin_link'        => 'Sign in here',

    # ── Community navigation links ──
    'nav_see_all_categories'  => 'Click here to see All Community Categories',
    'nav_all_categories'      => '← All Community Categories',

    # ── Listings page ──
    'listings_join_cta'            => 'Log In or Join to add your own Community Listings',
    'listings_hero_title'          => 'Exchange & Find',
    'listings_hero_subtitle'       => 'Giveaway · Trade · Sell · Rent · In Search Of',
    'listings_filter_all'          => 'All',
    'listings_filter_giveaway'     => 'Giveaway',
    'listings_filter_trade'        => 'Trade',
    'listings_filter_sell'         => 'Sell',
    'listings_filter_rent'         => 'Rent',
    'listings_filter_iso'          => 'ISO',
    'listings_search_placeholder'  => 'Search listings…',
    'listings_search_btn'          => 'Search',
    'listings_post_btn'            => '+ Post a Listing',
    'listings_empty'               => 'No listings found.',

    # ── Welcome email (sent 2 hours after registration) ──
    'welcome_email_subject'   => 'Welcome to MiaCivezza.com!',
    'welcome_email_body'      => "We're delighted you've joined the MiaCivezza.com community. Civezza and the Imperia coast are a special place, and so are the people who love it.\n\nTake a look around — browse Community Events, Restaurants, Services, and more. If you'd like to add your own entries or share your story, we'd love to hear from you.\n\nWe hope you enjoy being part of this little corner of Liguria online.",
    'welcome_email_cta_label' => 'Explore the Community',

    # ── Create Account Modal ──
    'join_modal_title'        => 'Signing up on MiaCivezza.com',
    'join_modal_preamble'     => 'Create a free account to post, connect with neighbours, and participate in community events.',
    'join_modal_signup_btn'   => 'Sign up here right now!',
    'join_modal_explore_btn'  => 'Explore the Community',

    # ── How It Works / Guide page ──
    'guide_page_title'        => 'How MiaCivezza.com Works',
    'guide_page_intro'        => "MiaCivezza.com is more than a social network — it's a digital piazza for the Civezza and Imperia coast community. Here's a quick tour of everything you can do.",

    'guide_bio_title'         => 'Why I Built This',

    'guide_tip_title'         => '💡 Tip: Start on a computer, if you can',
    'guide_tip_body'          => [
      'The richest way to get familiar with MiaCivezza.com — browsing every category, writing your first posts, and uploading photos — is easiest on a desktop computer or laptop.',
      'You will see all three columns of miacivezza.com at once and can easily get acquainted with all its features.',
      "Once you've added your entries and found your way around, your phone's browser is perfect for everyday use: checking events, browsing listings, and staying in touch while you're out and about.",
    ].join("\n"),

    'guide_intro_title'       => 'What is MiaCivezza.com?',
    'guide_intro_body'        => [
      "MiaCivezza.com is a private community bulletin board for residents, visitors, and friends of Civezza and the Imperia coast. It's built on the same technology as social networks like X or Whatsapp, but closed, exclusive to our community — you won't find strangers from around the world here, just neighbours and friends.",
      'Use it to find local services, discover events, coordinate visits, read community news, and stay connected between trips.',
      'We are building this website by inviting YOU to start filling it up with your own content. As more people join and begin to post in our different categories you will see MiaCivezza.com become more beautiful, useful and we hope indispensable to your daily Civezza centered experiences!',
    ].join("\n"),

    'guide_join_title'        => 'Joining & Signing In',
    'guide_join_body'         => "Registration is free — just click \"Join\" or \"Create Account\" from the home page and fill in a username, email, and password. Because this is a closed community, new accounts may need a moment of admin approval before you're fully signed in. Once approved, use \"Log In\" anytime with your email and password. If you forget your password, use the \"Forgot password?\" link on the sign-in page.",

    'guide_community_title'   => 'The Community Hub',
    'guide_community_body'    => 'Click "Community" in the menu to see the full directory as a grid of colourful tiles — Listings, Events, Properties, Services, Restaurants, Artists, When I\'m In Town, and Member Stories. Tap any tile to jump straight to that section.',

    'guide_listings_title'    => 'Browsing Listings & Categories',
    'guide_listings_body'     => '"Listings" is where members buy, sell, trade, or give away items, and where you\'ll find dedicated categories for Community Services (local businesses, tradespeople, professionals), Restaurants, Properties (for sale, rent, or vacation stays), and Artists. Use the filter buttons to narrow by type, or the search bar to find something specific. Signed-in members can post their own entries with the "+" button — add photos, a description, and contact details.',

    'guide_visits_title'      => "When I'm In Town",
    'guide_visits_body'       => "This calendar lets you privately share the dates you'll be visiting Civezza, so friends can plan to meet up while you're both around. Add your travel dates and choose who can see them — just you, your connections, a hand-picked group, or all members. You'll get a notification if your dates overlap with someone you know, so you never miss a chance to catch up.",

    'guide_events_title'      => 'Community Events',
    'guide_events_body'       => 'Browse a live calendar of concerts, festivals, markets, and gatherings happening around Civezza and the Imperia coast — including events our team automatically finds from local news sources, and events posted directly by members. Click any highlighted day to see what\'s on, or use the filter chips (This Week, This Month, etc.) to jump ahead. Members can post their own events with the "Post an Event" button.',

    'guide_digest_title'      => 'The Daily Digest',
    'guide_digest_body'       => 'Every morning, MiaCivezza.com publishes a bilingual (Italian & English) newspaper-style digest of upcoming local events and community news — a quick way to catch up without scrolling through everything yourself. Find it at "Daily Digest" in the menu, and use the language toggle at the top of the page to switch between Italian and English.',

    'guide_newsletters_title' => 'Newsletters',
    'guide_newsletters_body'  => "From time to time, community members publish longer newsletters — stories, reflections, and updates from around Civezza. You'll find them linked from the Daily Digest, or browse the full archive anytime. Many newsletters also offer the original PDF for download.",

    'guide_stories_title'     => 'Member Stories',
    'guide_stories_body'      => 'Member Stories is where residents and regular visitors share their own connection to Civezza — how they arrived, a moment that shaped them, and why they joined the community. Signed-in members can write their own story with up to three photos, and choose when to publish it for others to read.',

    'guide_language_title'    => 'Switching Languages',
    'guide_language_body'     => "Tap the globe icon at the top of the menu to change the language you're viewing the site in — handy if you're showing the site to a visiting friend who doesn't read Italian, or vice versa. This only changes what you see; it doesn't change your account settings.",

    'guide_contact_title'     => 'Getting Help',
    'guide_contact_body'      => 'Have a question, found a problem, or want to suggest something? Use "Contact Admin" in the menu to send a message directly to the team — we read every one.',
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
