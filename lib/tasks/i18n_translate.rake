# frozen_string_literal: true
#
# Translates community.* locale keys from en.json into each target locale file
# using the DeepL API. Safe to re-run — existing keys are never overwritten.
#
# Usage (on Hetzner, after git pull):
#
#   RAILS_ENV=production bundle exec rails i18n:translate_community
#
# Options (ENV vars):
#   LOCALES   — comma-separated locale codes, default: all language-switcher locales
#   PREFIX    — key prefix to translate, default: community.
#   DRY_RUN=1 — show what would happen without writing any files
#
# Examples:
#   # Translate all community keys into all 7 locales
#   RAILS_ENV=production bundle exec rails i18n:translate_community
#
#   # Italian only, preview first
#   RAILS_ENV=production bundle exec rails i18n:translate_community LOCALES=it DRY_RUN=1
#   RAILS_ENV=production bundle exec rails i18n:translate_community LOCALES=it
#
# After running, always redeploy assets:
#   RAILS_ENV=production bundle exec rails assets:precompile && sudo systemctl restart mastodon-web

namespace :i18n do
  desc 'Translate community.* keys from en.json into locale files via DeepL (idempotent)'
  task translate_community: :environment do
    require 'json'

    # ── Config ───────────────────────────────────────────────────────────────
    dl_cfg   = Rails.configuration.x.translation.deepl
    api_key  = dl_cfg[:api_key].presence or
               abort('ERROR: DEEPL_API_KEY is not set in .env.production')
    endpoint = dl_cfg[:plan] == 'free' ? 'https://api-free.deepl.com/v2' : 'https://api.deepl.com/v2'

    prefix         = ENV.fetch('PREFIX', 'community.')
    dry_run        = ENV['DRY_RUN'] == '1'
    target_locales = ENV['LOCALES'].present? ? ENV['LOCALES'].split(',').map(&:strip) : %w[it fr de sv es no nl]

    # DeepL target-language codes differ for some locales
    deepl_code = ->(locale) { { 'no' => 'NB', 'pt' => 'PT-PT', 'en' => 'EN-GB' }.fetch(locale, locale.upcase) }

    locales_dir = Rails.root.join('app/javascript/flavours/glitch/locales')
    en_source   = JSON.parse(File.read(locales_dir.join('en.json')))

    source_keys = en_source.select { |k, _| k.start_with?(prefix) }
    puts "Source keys with prefix '#{prefix}': #{source_keys.size}"

    # ICU plural strings ({count, plural, one {…} other {…}}) cannot be round-
    # tripped through DeepL safely — the structure must be preserved while only
    # the embedded words change. Flag them for manual translation.
    icu_re = /\{[^}]+,\s*plural,/

    # ── Placeholder protection ────────────────────────────────────────────────
    # Replace {simple_var} interpolations with <x id="N"/> XML elements.
    # DeepL preserves XML elements when tag_handling=xml + ignore_tags=x.

    protect_placeholders = lambda do |text|
      store = []
      safe  = text.gsub(/\{[A-Za-z_][A-Za-z0-9_]*\}/) do |match|
        idx = store.size; store << match; "<x id=\"#{idx}\"/>"
      end
      [safe, store]
    end

    restore_placeholders = lambda do |text, store|
      # DeepL sometimes emits a space before the closing slash: <x id="0" />
      text.gsub(/<x\s+id="(\d+)"\s*\/>/) { store[$1.to_i] || $& }
    end

    # ── DeepL API call ────────────────────────────────────────────────────────
    call_deepl = lambda do |texts, target_lang|
      response = HTTP
        .auth("DeepL-Auth-Key #{api_key}")
        .post("#{endpoint}/translate", json: {
          text:         texts,
          target_lang:  target_lang,
          tag_handling: 'xml',
          ignore_tags:  'x',
        })

      unless response.status.success?
        abort("DeepL API error #{response.status}: #{response.body.to_s.first(300)}")
      end

      JSON.parse(response.body.to_s)['translations'].map { |t| t['text'] }
    end

    # ── Per-locale processing ─────────────────────────────────────────────────
    puts ''
    target_locales.each do |locale|
      locale_file = locales_dir.join("#{locale}.json")
      existing    = File.exist?(locale_file) ? JSON.parse(File.read(locale_file)) : {}

      missing = source_keys.reject { |k, _| existing.key?(k) }

      if missing.empty?
        puts "#{locale}: all #{source_keys.size} keys already present — nothing to do"
        next
      end

      icu_keys, plain_keys = missing.partition { |_, v| v.match?(icu_re) }

      if icu_keys.any?
        puts "#{locale}: #{icu_keys.size} ICU plural key(s) need MANUAL translation:"
        icu_keys.each do |k, v|
          puts "    #{k}"
          puts "    EN:  #{v}"
          puts
        end
      end

      puts "#{locale}: #{plain_keys.size} keys → DeepL #{deepl_code.call(locale)}#{dry_run ? ' (DRY RUN)' : ''}"
      next if dry_run || plain_keys.empty?

      # Protect {var} placeholders in every string before sending
      pairs = plain_keys.map do |key, val|
        safe, store = protect_placeholders.call(val)
        [key, safe, store]
      end

      all_safe       = pairs.map { |_, s, _| s }
      all_translated = []

      all_safe.each_slice(50).with_index(1) do |batch, n|
        print "  [#{locale}] batch #{n}/#{(all_safe.size / 50.0).ceil} (#{batch.size} strings)… "
        all_translated.concat(call_deepl.call(batch, deepl_code.call(locale)))
        puts 'ok'
        sleep 0.25 unless n * 50 >= all_safe.size   # don't sleep after last batch
      end

      # Restore placeholders and merge into the locale file
      pairs.each_with_index do |(key, _, store), i|
        existing[key] = restore_placeholders.call(all_translated[i], store)
      end

      # Write sorted so git diffs stay clean
      File.write(locale_file, "#{JSON.pretty_generate(existing.sort.to_h)}\n")
      puts "#{locale}: wrote #{plain_keys.size} new translation(s) → #{locale_file.basename}\n"
    end

    puts "\nAll done."
    puts 'Next: RAILS_ENV=production bundle exec rails assets:precompile && sudo systemctl restart mastodon-web'
  end
end
