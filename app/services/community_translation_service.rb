# frozen_string_literal: true

# Thin wrapper over DeepL and LibreTranslate for translating community entry
# field content. Source language is auto-detected by the API — no source_lang
# param is sent, so mixed-language communities work naturally.
#
# Usage:
#   CommunityTranslationService.new.translate(text, target_locale: 'it')

class CommunityTranslationService
  Error = Class.new(StandardError)

  # DeepL requires region-specific codes for some locales
  DEEPL_LOCALE_MAP = {
    'pt' => 'PT-PT',
    'no' => 'NB',
    'en' => 'EN-GB',
  }.freeze

  def translate(text, target_locale:)
    return nil if text.blank?

    config = Rails.configuration.x.translation
    if config.deepl[:api_key].present?
      translate_deepl(text, target_locale)
    elsif config.libre_translate[:endpoint].present?
      translate_libre(text, target_locale)
    else
      raise Error, 'No translation service configured — set DEEPL_API_KEY in .env.production'
    end
  end

  # Translate many texts in one DeepL API call. Accepts { key => text } hash,
  # returns { key => translated_text } hash. Keys with blank text are skipped.
  def translate_batch(key_text_hash, target_locale:)
    return {} if key_text_hash.blank?

    filtered = key_text_hash.reject { |_, v| v.blank? }
    return {} if filtered.empty?

    config = Rails.configuration.x.translation
    if config.deepl[:api_key].present?
      translate_deepl_batch(filtered, target_locale)
    else
      filtered.each_with_object({}) do |(key, text), acc|
        acc[key] = translate(text, target_locale: target_locale)
      rescue Error
        nil
      end
    end
  end

  private

  def translate_deepl(text, target)
    code = DEEPL_LOCALE_MAP[target] || target.upcase
    response = HTTP.auth("DeepL-Auth-Key #{deepl_api_key}")
                   .post("#{deepl_endpoint}/translate", json: {
                     text: [text],
                     target_lang: code,
                   })
    raise Error, "DeepL returned #{response.status}" unless response.status.success?

    result = JSON.parse(response.body.to_s).dig('translations', 0, 'text')
    raise Error, 'DeepL returned empty translation' if result.blank?

    result
  end

  # Batches all texts into ≤50-item DeepL requests (API limit per call).
  def translate_deepl_batch(key_text_hash, target)
    code   = DEEPL_LOCALE_MAP[target] || target.upcase
    keys   = key_text_hash.keys
    texts  = key_text_hash.values
    result = {}

    texts.each_slice(50).with_index do |slice_texts, chunk|
      slice_keys = keys[chunk * 50, slice_texts.length]
      response   = HTTP.auth("DeepL-Auth-Key #{deepl_api_key}")
                       .post("#{deepl_endpoint}/translate", json: {
                         text:        slice_texts,
                         target_lang: code,
                       })
      raise Error, "DeepL returned #{response.status}" unless response.status.success?

      translations = JSON.parse(response.body.to_s)['translations']
      slice_keys.each_with_index { |k, i| result[k] = translations[i]['text'] }
    end

    result
  end

  def translate_libre(text, target)
    response = HTTP.post("#{Setting.libre_translate_endpoint}/translate", json: {
      q:       text,
      source:  'auto',
      target:  target,
      api_key: Setting.libre_translate_api_key.presence || '',
    })
    raise Error, "LibreTranslate returned #{response.status}" unless response.status.success?

    result = JSON.parse(response.body.to_s)['translatedText']
    raise Error, 'LibreTranslate returned empty translation' if result.blank?

    result
  end

  def deepl_api_key
    Rails.configuration.x.translation.deepl[:api_key]
  end

  def deepl_endpoint
    # Free-tier API keys end in :fx
    Rails.configuration.x.translation.deepl[:plan] == 'free' ?
      'https://api-free.deepl.com/v2' :
      'https://api.deepl.com/v2'
  end
end
