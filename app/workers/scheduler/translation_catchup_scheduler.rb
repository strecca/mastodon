# frozen_string_literal: true

# Runs nightly. Finds any community entry that is missing translations for
# one or more target locales and queues CommunityTranslationWorker for it.
# The worker's SHA256 digest check skips already-translated fields, so this
# is safe to run even when entries are partially translated.

class Scheduler::TranslationCatchupScheduler
  include Sidekiq::Worker
  sidekiq_options queue: 'scheduler'

  CATEGORY_TYPES = %w[
    CommunityService
    CommunityEvent
    CommunityRestaurant
    CommunityArtist
    CommunityProperty
    CommunityListing
    CivezzaMemberStory
  ].freeze

  def perform
    target_count = CommunityTranslationWorker::TARGET_LOCALES.size
    total_queued = 0

    CATEGORY_TYPES.each do |type|
      complete_ids = CommunityEntryTranslation
        .where(translatable_type: type)
        .group(:translatable_id)
        .having('COUNT(DISTINCT locale) >= ?', target_count)
        .pluck(:translatable_id)
        .to_set

      incomplete = type.constantize
        .where.not(id: complete_ids)
        .pluck(:id)

      next if incomplete.empty?

      Sidekiq::Client.push_bulk(
        'class' => 'CommunityTranslationWorker',
        'queue' => 'low',
        'args'  => incomplete.map { |id| [type, id] }
      )

      Rails.logger.info("[TranslationCatchup] Queued #{incomplete.size} #{type} entries")
      total_queued += incomplete.size
    end

    Rails.logger.info("[TranslationCatchup] Done — #{total_queued} jobs queued") if total_queued > 0
  end
end
