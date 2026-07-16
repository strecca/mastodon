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

    # Simple count plural pattern — the only ICU form used in community keys:
    #   {count, plural, one {# WORD} other {# WORDS}}
    #   {day} — {count, plural, one {# WORD} other {# WORDS}}
    # We extract the embedded words, translate them with the same DeepL batch,
    # and reassemble the ICU wrapper.
    simple_plural_re = /^(\{day\} — )?\{count, plural, one \{# ([^}]+)\} other \{# ([^}]+)\}\}$/

    # Any ICU pattern we can't auto-translate gets flagged for manual work.
    other_icu_re = /\{[^}]+,\s*(plural|select|selectordinal),/

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

      # Three-way split: plain strings / simple-count-plural ICU / complex ICU
      plain_keys   = []
      simple_icu   = []   # [{ key:, prefix:, singular:, plural: }]
      complex_icu  = []

      missing.each do |key, val|
        if (m = val.match(simple_plural_re))
          simple_icu << { key: key, prefix: m[1].to_s, singular: m[2], plural: m[3] }
        elsif val.match?(other_icu_re)
          complex_icu << [key, val]
        else
          plain_keys << [key, val]
        end
      end

      if complex_icu.any?
        puts "#{locale}: #{complex_icu.size} complex ICU key(s) need MANUAL translation:"
        complex_icu.each { |k, v| puts "    #{k}\n    EN:  #{v}\n" }
      end

      total_auto = plain_keys.size + simple_icu.size
      puts "#{locale}: #{plain_keys.size} plain + #{simple_icu.size} count-plural → DeepL #{deepl_code.call(locale)}#{dry_run ? ' (DRY RUN)' : ''}"
      next if dry_run || total_auto.zero?

      # Build a single flat array: [plain_0, plain_1, …, icu_0_sg, icu_0_pl, icu_1_sg, icu_1_pl, …]
      plain_pairs = plain_keys.map do |key, val|
        safe, store = protect_placeholders.call(val)
        { key: key, safe: safe, store: store }
      end

      icu_word_texts = simple_icu.flat_map { |e| [e[:singular], e[:plural]] }
      all_texts      = plain_pairs.map { |p| p[:safe] } + icu_word_texts
      all_translated = []

      all_texts.each_slice(50).with_index(1) do |batch, n|
        total_batches = (all_texts.size / 50.0).ceil
        print "  [#{locale}] batch #{n}/#{total_batches} (#{batch.size} strings)… "
        all_translated.concat(call_deepl.call(batch, deepl_code.call(locale)))
        puts 'ok'
        sleep 0.25 unless n * 50 >= all_texts.size
      end

      # Restore plain strings
      plain_pairs.each_with_index do |p, i|
        existing[p[:key]] = restore_placeholders.call(all_translated[i], p[:store])
      end

      # Reassemble simple ICU plural strings
      offset = plain_pairs.size
      simple_icu.each_with_index do |entry, i|
        sg = all_translated[offset + i * 2].strip
        pl = all_translated[offset + i * 2 + 1].strip
        existing[entry[:key]] = if entry[:prefix].empty?
          "{count, plural, one {# #{sg}} other {# #{pl}}}"
        else
          "#{entry[:prefix]}{count, plural, one {# #{sg}} other {# #{pl}}}"
        end
      end

      # Write sorted so git diffs stay clean
      File.write(locale_file, "#{JSON.pretty_generate(existing.sort.to_h)}\n")
      puts "#{locale}: wrote #{total_auto} new translation(s) → #{locale_file.basename}\n"
    end

    puts "\nAll done."
    puts 'Next: RAILS_ENV=production bundle exec rails assets:precompile && sudo systemctl restart mastodon-web'
  end
end
