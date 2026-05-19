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

  sidekiq_options queue: 'default', retry: 5

  # All target locales. English is assumed to be the primary submission
  # language and is excluded. Add/remove as the community grows.
  TARGET_LOCALES = %w[it de fr es pt nl da sv no sl sq].freeze

  def perform(translatable_type, translatable_id)
    entry = translatable_type.constantize.find_by(id: translatable_id)
    return unless entry

    config = load_config(translatable_type)
    return unless config

    translatable_fields = (config['fields'] || []).select { |f| f['translatable'] }
    return if translatable_fields.empty?

    service = CommunityTranslationService.new

    TARGET_LOCALES.each do |locale|
      translatable_fields.each do |field|
        translate_field(entry, translatable_type, field, locale, service)
      end
    end
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
  rescue CommunityTranslationService::Error, HTTP::Error => e
    Rails.logger.warn("[CommunityTranslation] #{translatable_type}##{entry.id} #{locale}/#{db_name}: #{e.message}")
    # Continue — don't abort other fields or locales
  end

  def load_config(translatable_type)
    # "CommunityArtist" → "artist" → config path community_artists/config.json
    category_key = translatable_type.delete_prefix('Community').underscore
    config_path  = Rails.root.join(
      'app', 'javascript', 'flavours', 'glitch', 'features',
      "community_#{category_key}", 'config.json'
    )
    return nil unless File.exist?(config_path)

    JSON.parse(File.read(config_path))
  end
end
