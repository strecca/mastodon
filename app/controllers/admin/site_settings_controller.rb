# frozen_string_literal: true

module Admin
  class SiteSettingsController < ApplicationController
    layout 'admin'

    before_action :authenticate_user!
    before_action :require_admin!

    SUPPORTED_LOCALES = %w[en it fr de sv nb es nl].freeze

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
        about_photo_url
      ],
      'Server Banner' => %w[
        server_hero_cta
        server_description
      ],
      'Category Column Headers' => %w[
        col_listings_title
        col_events_title
        col_properties_title
        col_services_title
        col_restaurants_title
        col_artists_title
        col_visits_title
        col_stories_title
      ],
      'Login Page' => %w[
        login_title
        login_preamble
      ],
      'Join / Sign-up Page' => %w[
        join_title
        join_tagline
        join_benefits_heading
        join_benefit_1_title
        join_benefit_1_desc
        join_benefit_2_title
        join_benefit_2_desc
        join_benefit_3_title
        join_benefit_3_desc
        join_benefit_4_title
        join_benefit_4_desc
        join_cta_note
        join_signup_btn
        join_signin_note
        join_signin_link
      ],
      'Create Account Modal' => %w[
        join_modal_title
        join_modal_preamble
        join_modal_signup_btn
        join_modal_explore_btn
      ],
      'Community Navigation' => %w[
        nav_see_all_categories
        nav_all_categories
      ],
      'Listings Page' => %w[
        listings_join_cta
        listings_hero_title
        listings_hero_subtitle
        listings_filter_all
        listings_filter_giveaway
        listings_filter_trade
        listings_filter_sell
        listings_filter_rent
        listings_filter_iso
        listings_search_placeholder
        listings_search_btn
        listings_post_btn
        listings_empty
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
          next if value.blank?  # empty field = keep existing DB value / use JSX fallback

          SiteContent.set(key, value, locale: locale)
          saved += 1
        end
      end

      redirect_to edit_admin_site_settings_path,
                  notice: "Saved #{saved} content values."
    end

    def auto_translate
      locale = params[:locale].to_s.downcase
      unless SUPPORTED_LOCALES.include?(locale) && locale != 'en'
        return redirect_to edit_admin_site_settings_path, alert: 'Invalid target locale.'
      end

      all_keys  = CONTENT_GROUPS.values.flatten
      en_values = SiteContent.where(key: all_keys, locale: 'en')
                              .pluck(:key, :value)
                              .to_h
                              .reject { |_, v| v.blank? }

      if en_values.empty?
        return redirect_to edit_admin_site_settings_path, alert: 'No English content found to translate.'
      end

      # Skip keys that already have a saved translation in the target locale
      already_done = SiteContent.where(key: all_keys, locale: locale)
                                 .where.not(value: [nil, ''])
                                 .pluck(:key)
                                 .to_set

      missing = en_values.reject { |key, _| already_done.include?(key) }

      if missing.empty?
        return redirect_to edit_admin_site_settings_path,
                           notice: "All #{locale.upcase} translations are already filled in — nothing to do."
      end

      service    = CommunityTranslationService.new
      translated = service.translate_batch(missing, target_locale: locale)
      saved      = 0

      translated.each do |key, value|
        next if value.blank?
        SiteContent.set(key, value, locale: locale)
        saved += 1
      end

      skipped = already_done.size
      redirect_to edit_admin_site_settings_path,
                  notice: "Auto-translated #{saved} new values to #{locale.upcase} via DeepL#{skipped > 0 ? " (#{skipped} already had translations, skipped)" : ''}."
    rescue CommunityTranslationService::Error => e
      redirect_to edit_admin_site_settings_path, alert: "Translation failed: #{e.message}"
    end

    private

    def require_admin!
      return if current_user&.can?(:administrator)

      redirect_to root_path, alert: 'Not authorized.'
    end
  end
end
