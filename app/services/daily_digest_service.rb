# frozen_string_literal: true

# Generates a daily AI newspaper digest from scraped community events.
# Calls the Anthropic API (Claude) to write a bilingual (IT/EN) digest
# in newspaper-column style, then stores it in community_daily_digests.
#
# Usage:
#   DailyDigestService.new.generate              # today
#   DailyDigestService.new.generate(date: Date.yesterday)

class DailyDigestService
  Error = Class.new(StandardError)

  ANTHROPIC_API  = 'https://api.anthropic.com/v1/messages'
  MAX_TOKENS     = 2048
  LOOKAHEAD_DAYS = 60

  SYSTEM_PROMPT = <<~SYSTEM.freeze
    You are the editorial voice of MiaCivezza.com — a private, members-only community
    platform for people with roots in, or deep ties to, the Imperia province and the
    Ligurian Riviera of northwestern Italy. "Mia Civezza" takes its name from the small
    hilltop village of Civezza, a few kilometres inland from San Lorenzo al Mare.

    The community includes:
    - Italian residents of the Imperia area (San Lorenzo al Mare, Civezza, Diano Marina,
      Imperia, Arma di Taggia, and surrounding towns)
    - Italians who have emigrated abroad but maintain strong ties to the region
    - Non-Italian partners, friends, and admirers of this corner of Liguria

    The site's character:
    - Warm, welcoming, and genuinely local — not a generic news aggregator
    - Bilingual (Italian primary, English secondary) because many members read both
    - Community-spirited: celebrates local culture, food, festivals, olive harvests,
      the sea, the hills, and the rhythms of Ligurian life
    - Non-commercial and non-political — focused on connection, not controversy
    - The tone of a knowledgeable local friend who loves the area deeply

    When writing the daily digest:
    - Write as if addressed to people who care about this specific place, not Italy in general
    - Reference local landmarks, traditions, and seasonal context naturally where relevant
    - The Italian version should feel like a local would write it — not translated Italian
    - The English version should help non-Italian-speaking members feel included
    - Never fabricate events, dates, or details beyond what is provided
  SYSTEM

  def generate(date: Date.today)
    events = fetch_events(date)
    return nil if events.empty?

    result = call_claude(build_prompt(date, events))

    digest = CommunityDailyDigest.find_or_initialize_by(digest_date: date)
    digest.content_it    = result[:it]
    digest.content_en    = result[:en]
    digest.article_count = events.size
    digest.generated_at  = Time.current
    digest.save!
    digest
  end

  private

  def fetch_events(date)
    CommunityEvent
      .where(status: :approved, auto_imported: true)
      .where(event_date: date..LOOKAHEAD_DAYS.days.from_now(date))
      .order(event_date: :asc)
      .limit(30)
  end

  def build_prompt(date, events)
    events_text = events.map do |e|
      lines = ["- #{e.event_name}"]
      lines << "  Data: #{e.event_date.strftime('%-d %B %Y')}"
      if e.end_date.present? && e.end_date.to_date != e.event_date.to_date
        lines << "  Fine: #{e.end_date.strftime('%-d %B %Y')}"
      end
      lines << "  Luogo: #{e.location_town_city}" if e.location_town_city.present?
      lines << "  Fonte: #{e.source_name}" if e.source_name.present?
      lines << "  Descrizione: #{e.event_description.truncate(300)}" if e.event_description.present?
      lines.join("\n")
    end.join("\n\n")

    <<~PROMPT
      Sei il redattore di MiaCivezza.com, un sito di comunità dedicato alle persone con legami con la regione di Imperia e della Liguria nordoccidentale, e agli italiani che vivono all'estero.

      Oggi è #{I18n.l(date, format: :long, locale: :it) rescue date.strftime('%-d %B %Y')}.

      Di seguito trovi gli eventi comunitari in arrivo, raccolti da fonti locali come Comune di San Lorenzo al Mare, CentroItalia e La Voce di Imperia.

      EVENTI IN PROGRAMMA:
      #{events_text}

      Scrivi un caldo e coinvolgente notiziario quotidiano in stile giornale locale. Requisiti per la versione italiana:
      - Scritto in italiano, 250–400 parole
      - Tono accogliente e spirito comunitario
      - Metti in risalto gli eventi più significativi
      - Raggruppa per tema o vicinanza di data se naturale
      - Concludi con un invito a visitare miacivezza.com per ulteriori dettagli

      Poi scrivi la stessa notizia in inglese (stesso tono, stesso contenuto, 250–400 parole).

      Rispondi SOLO con JSON valido in questo formato esatto (nessun testo prima o dopo):
      {"it": "testo italiano qui...", "en": "english text here..."}
    PROMPT
  end

  def call_claude(prompt)
    config  = Rails.configuration.x.daily_digest.anthropic
    api_key = config[:api_key]
    model   = config[:model].presence || 'claude-sonnet-4-6'

    raise Error, 'ANTHROPIC_API_KEY not configured in .env.production' if api_key.blank?

    response = HTTP
      .headers(
        'x-api-key'         => api_key,
        'anthropic-version' => '2023-06-01',
        'content-type'      => 'application/json'
      )
      .timeout(60)
      .post(ANTHROPIC_API, json: {
        model:      model,
        max_tokens: MAX_TOKENS,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: prompt }],
      })

    raise Error, "Anthropic API returned #{response.status}: #{response.body}" unless response.status.success?

    body = JSON.parse(response.body.to_s)
    text = body.dig('content', 0, 'text').to_s.strip

    # Strip markdown code fences if Claude wrapped the JSON
    text = text.gsub(/\A```(?:json)?\s*/, '').gsub(/\s*```\z/, '').strip

    json_match = text.match(/\{.*\}/m)
    raise Error, "Could not extract JSON from response: #{text.truncate(200)}" if json_match.nil?

    result = JSON.parse(json_match.to_s)
    { it: result['it'].to_s.strip, en: result['en'].to_s.strip }
  rescue JSON::ParserError => e
    raise Error, "JSON parse error: #{e.message}"
  end
end
