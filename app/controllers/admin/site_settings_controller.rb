# frozen_string_literal: true

module Admin
  class SiteSettingsController < ApplicationController
    layout 'admin'

    before_action :authenticate_user!
    before_action :require_admin!

    SUPPORTED_LOCALES = %w[en it fr de].freeze

    CONTENT_GROUPS = {
      'Landing Page — Hero' => %w[
        landing_logo_text
        landing_hero_tagline
        landing_see_posts_btn
        landing_login_link
      ],
      'Landing Page — Join CTA' => %w[
        landing_join_heading
        landing_join_feature_1
        landing_join_feature_2
        landing_join_feature_3
        landing_join_footer
        landing_create_account
      ],
      'Landing Page — Category Tiles' => %w[
        tile_listings_label  tile_listings_desc
        tile_events_label    tile_events_desc
        tile_properties_label tile_properties_desc
        tile_services_label  tile_services_desc
        tile_restaurants_label tile_restaurants_desc
        tile_artists_label   tile_artists_desc
        tile_visits_label    tile_visits_desc
        tile_stories_label   tile_stories_desc
      ],
      'About Page' => %w[
        about_cta
        about_bio_p1
        about_bio_p2
      ],
      'Server Banner' => %w[
        server_hero_cta
      ],
    }.freeze

    def edit
      all_keys = CONTENT_GROUPS.values.flatten
      rows     = SiteContent.where(key: all_keys)

      @content = {}
      SUPPORTED_LOCALES.each do |locale|
        @content[locale] = rows.select { |r| r.locale == locale }
                               .each_with_object({}) { |r, h| h[r.key] = r.value }
      end
      @groups = CONTENT_GROUPS
    end

    def update
      sc_params = params[:site_content] || {}
      saved = 0

      sc_params.each do |key, locale_hash|
        locale_hash.each do |locale, value|
          next unless SUPPORTED_LOCALES.include?(locale)

          value = value.to_s.strip
          next if value.blank? && locale != 'en'

          SiteContent.set(key, value, locale: locale)
          saved += 1
        end
      end

      redirect_to edit_admin_site_settings_path,
                  notice: "Saved #{saved} content values."
    end

    private

    def require_admin!
      return if current_user&.can?(:administrator)

      redirect_to root_path, alert: 'Not authorized.'
    end
  end
end
