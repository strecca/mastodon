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

  MAX_TOKENS     = 2048
  LOOKAHEAD_DAYS = 60

  OUTPUT_SCHEMA = {
    type: 'object',
    properties: {
      it: { type: 'string' },
      en: { type: 'string' },
    },
    required: %w(it en),
    additionalProperties: false,
  }.freeze

  SYSTEM_PROMPT = <<~SYSTEM.freeze
    You are the editorial voice of MiaCivezza.com - a private, members-only community
    platform for people with roots in, or deep ties to, the Imperia province and the
    Ligurian Riviera of northwestern Italy. "Mia Civezza" takes its name from the small
    hilltop village of Civezza, a few kilometres inland from San Lorenzo al Mare.

    The community includes:
    - Italian residents of the Imperia area (San Lorenzo al Mare, Civezza, Diano Marina,
      Imperia, Arma di Taggia, and surrounding towns)
    - Italians who have emigrated abroad but maintain strong ties to the region
    - Non-Italian partners, friends, and admirers of this corner of Liguria

    The site's character:
    - Warm, welcoming, and genuinely local - not a generic news aggregator
    - Bilingual (Italian primary, English secondary) because many members read both
    - Community-spirited: celebrates local culture, food, festivals, olive harvests,
      the sea, the hills, and the rhythms of Ligurian life
    - Non-commercial and non-political - focused on connection, not controversy
    - The tone of a knowledgeable local friend who loves the area deeply

    When writing the daily digest:
    - Write as if addressed to people who care about this specific place, not Italy in general
    - Reference local landmarks, traditions, and seasonal context naturally where relevant
    - The Italian version should feel like a local would write it - not translated Italian
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

  def fetch_recent_newsletter(date)
    CommunityNewsletter.for_digest.order(published_on: :desc).first
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

    newsletter      = fetch_recent_newsletter(date)
    newsletter_note = if newsletter
      url = "https://#{Rails.configuration.x.web_domain}/newsletters/#{newsletter.slug}"
      "NEWSLETTER DELLA COMUNITA': \"#{newsletter.title}\" di #{newsletter.author_name} (#{url})\nRiepilogo: #{newsletter.digest_summary}"
    else
      nil
    end

    newsletter_section = newsletter_note ? <<~NL : ''
      C'e' anche una newsletter recente della comunita':

      #{newsletter_note}

      Apri il testo del digest con un paragrafo breve e caloroso che invita i lettori a leggere la newsletter. Incorpora il link usando ESATTAMENTE il formato markdown: [Leggi la newsletter](#{url}) - non incollare l'URL come testo nudo. Poi prosegui con gli eventi.

    NL

    <<~PROMPT
      Sei il redattore di MiaCivezza.com, un sito di comunità dedicato alle persone con legami con la regione di Imperia e della Liguria nordoccidentale, e agli italiani che vivono all'estero.

      Oggi è #{I18n.l(date, format: :long, locale: :it) rescue date.strftime('%-d %B %Y')}.

      Di seguito trovi gli eventi comunitari in arrivo, raccolti da fonti locali come Comune di San Lorenzo al Mare, CentroItalia e La Voce di Imperia.

      #{newsletter_section}EVENTI IN PROGRAMMA:
      #{events_text}

      Scrivi un caldo e coinvolgente notiziario quotidiano in stile giornale locale. Requisiti per la versione italiana:
      - Scritto in italiano, 250-400 parole
      - Tono accogliente e spirito comunitario
      - Metti in risalto gli eventi più significativi
      - Raggruppa per tema o vicinanza di data se naturale
      - Concludi con un invito a visitare miacivezza.com per ulteriori dettagli

      Poi scrivi la stessa notizia in inglese (stesso tono, stesso contenuto, 250-400 parole).
    PROMPT
  end

  def call_claude(prompt)
    config  = Rails.configuration.x.daily_digest.anthropic
    api_key = config[:api_key]
    model   = config[:model].presence || 'claude-sonnet-4-6'

    raise Error, 'ANTHROPIC_API_KEY not configured in .env.production' if api_key.blank?

    client = Anthropic::Client.new(api_key: api_key)

    response = client.messages.create(
      model: model,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } }
    )

    parse_response(response)
  rescue Anthropic::Errors::APIStatusError, Anthropic::Errors::APIConnectionError => e
    raise Error, "Anthropic API error: #{e.message}"
  end

  def parse_response(response)
    text   = response.content.first&.text.to_s
    result = JSON.parse(text)
    { it: result['it'].to_s.strip, en: result['en'].to_s.strip }
  rescue JSON::ParserError => e
    raise Error, "JSON parse error: #{e.message}"
  end
end
