# frozen_string_literal: true

# Triggered after each community entry create or update.
#
# For every field marked `translatable: true` in the category's config.json,
# submits the text to the configured translation API and upserts the result
# into community_entry_translations — one row per (entry, locale, field).
#
# Idempotent: compares SHA256 of source text before calling the API, so
# re-runs and unchanged updates never waste API quota.

class CommunityTranslationWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'low', retry: 5

  # All target locales. English was originally excluded on the (wrong)
  # assumption that every member posts in English -- real members post in
  # German, Italian, etc. and their content never got an English
  # translation as a result. English translation into itself is a
  # harmless no-op for DeepL (no source-language detection exists here to
  # skip it conditionally). Add/remove as the community grows.
  TARGET_LOCALES = %w[en it de fr es pt nl da sv no sl sq].freeze

  # Models that don't have a features/community_*/config.json — field names listed directly.
  FIELD_OVERRIDES = {
    'CommunityListing'   => %w[title description trade_for],
    'CivezzaMemberStory' => %w[about_me civezza_story shaping_moment why_i_joined],
  }.freeze

  def perform(translatable_type, translatable_id)
    entry = translatable_type.constantize.find_by(id: translatable_id)
    return unless entry

    config = load_config(translatable_type)
    return unless config

    translatable_fields = (config['fields'] || []).select { |f| f['translatable'] }
    return if translatable_fields.empty?

    service = CommunityTranslationService.new
    failures = []

    TARGET_LOCALES.each do |locale|
      translatable_fields.each do |field|
        error = translate_field(entry, translatable_type, field, locale, service)
        failures << error if error
      end
    end

    # Re-raise so Sidekiq retries the job for any locales that failed.
    # Already-translated fields are skipped via SHA256 digest on retry — safe.
    raise failures.first if failures.any?
  end

  private

  def translate_field(entry, translatable_type, field, locale, service)
    db_name     = field['db_name']
    source_text = entry.public_send(db_name).to_s
    return if source_text.blank?

    digest = Digest::SHA256.hexdigest(source_text)

    existing = CommunityEntryTranslation.find_by(
      translatable_type: translatable_type,
      translatable_id:   entry.id,
      locale:            locale,
      field_name:        db_name
    )
    return if existing&.source_digest == digest

    translated = service.translate(source_text, target_locale: locale)
    return if translated.blank?

    CommunityEntryTranslation.upsert(
      { translatable_type: translatable_type,
        translatable_id:   entry.id,
        locale:            locale,
        field_name:        db_name,
        translated_text:   translated,
        source_digest:     digest,
        created_at:        Time.current,
        updated_at:        Time.current },
      unique_by: %i[translatable_type translatable_id locale field_name]
    )
    nil
  rescue CommunityTranslationService::Error, HTTP::Error => e
    Rails.logger.warn("[CommunityTranslation] #{translatable_type}##{entry.id} #{locale}/#{db_name}: #{e.message}")
    e  # return the error so perform can decide whether to retry
  end

  def load_config(translatable_type)
    # Models with hardcoded field lists (no config.json)
    if FIELD_OVERRIDES.key?(translatable_type)
      fields = FIELD_OVERRIDES[translatable_type].map { |n| { 'db_name' => n, 'translatable' => true } }
      return { 'fields' => fields }
    end

    # "CommunityArtist" → "artists" → config path community_artists/config.json
    category_key = translatable_type.delete_prefix('Community').underscore.pluralize
    config_path  = CommunityDirectoryConfig.config_path(category_key)
    return nil unless File.exist?(config_path)

    JSON.parse(File.read(config_path))
  end
end
