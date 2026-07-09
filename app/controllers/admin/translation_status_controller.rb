# frozen_string_literal: true

require 'sidekiq/api'

module Admin
  class TranslationStatusController < ApplicationController
    layout 'admin'

    before_action :authenticate_user!
    before_action :require_admin!

    TRANSLATABLE_CATEGORIES = [
      { label: 'Community Services',    klass: 'CommunityService'    },
      { label: 'Community Events',      klass: 'CommunityEvent'      },
      { label: 'Community Restaurants', klass: 'CommunityRestaurant' },
      { label: 'Community Artists',     klass: 'CommunityArtist'     },
      { label: 'Community Properties',  klass: 'CommunityProperty'   },
      { label: 'Community Listings',    klass: 'CommunityListing'    },
      { label: 'Member Stories',        klass: 'CivezzaMemberStory'  },
    ].freeze

    ALLOWED_CLASSES = TRANSLATABLE_CATEGORIES.map { |c| c[:klass] }.freeze
    TARGET_LOCALES  = CommunityTranslationWorker::TARGET_LOCALES

    def show
      @target_locales = TARGET_LOCALES
      @stats          = build_stats
      @total_rows     = CommunityEntryTranslation.count
      @sidekiq        = Sidekiq::Stats.new
    end

    def backfill
      klass_name = params[:klass].to_s
      unless ALLOWED_CLASSES.include?(klass_name)
        return redirect_to admin_translation_status_path, alert: 'Invalid category.'
      end

      count = 0
      klass_name.constantize.find_each do |entry|
        CommunityTranslationWorker.perform_async(klass_name, entry.id)
        count += 1
      end

      if count.zero?
        redirect_to admin_translation_status_path,
                    notice: "#{klass_name} has no entries to backfill."
      else
        redirect_to admin_translation_status_path,
                    notice: "Queued #{count} #{klass_name} entries for DeepL translation."
      end
    end

    private

    def build_stats
      translation_counts = CommunityEntryTranslation
        .group(:translatable_type, :locale)
        .count

      locale_sets = CommunityEntryTranslation
        .select(:translatable_type, :locale)
        .distinct
        .group_by(&:translatable_type)
        .transform_values { |rows| rows.map(&:locale).sort }

      TRANSLATABLE_CATEGORIES.map do |cat|
        klass_name = cat[:klass]
        total      = klass_name.constantize.count
        locales    = locale_sets[klass_name] || []
        rows       = locales.sum { |l| translation_counts[[klass_name, l]] || 0 }
        missing    = TARGET_LOCALES - locales

        {
          label:            cat[:label],
          klass:            klass_name,
          total:            total,
          translation_rows: rows,
          locales:          locales,
          missing:          missing,
          coverage_pct:     TARGET_LOCALES.empty? ? 0 : (locales.size * 100 / TARGET_LOCALES.size),
        }
      end
    end
  end
end
