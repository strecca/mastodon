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
