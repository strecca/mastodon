# frozen_string_literal: true

module Scrapers
  class LaVoceDiImperiaScraper < BaseScraper
    SOURCE_NAME = 'La Voce di Imperia'
    RSS_URL     = 'https://www.lavocediimperia.it/links/rss/argomenti/eventi-7/rss.xml'
    STALE_DAYS  = 14

    # Towns in Imperia province for location extraction from article titles
    KNOWN_TOWNS = %w[
      Imperia Civezza Diano\ Marina Cervo Sanremo Bordighera Ventimiglia
      Taggia Arma\ di\ Taggia Pontedassio Chiusanico Aurigo Porto\ Maurizio
      Oneglia Diano\ Castello Pieve\ di\ Teco Dolcedo Caramagna\ Ligure
      San\ Lorenzo\ al\ Mare Costarainera Lingueglietta
    ].freeze

    def fetch_events
      feed = fetch_rss(RSS_URL)
      return [] unless feed

      events = feed.items.filter_map { |item| parse_item(item) }
      Rails.logger.info("[LaVoceDiImperia] Parsed #{events.size} usable events from RSS")
      events
    end

    private

    def parse_item(item)
      title       = clean_text(item.title)
      description = clean_text(strip_html(item.description.to_s))
      link        = item.link.to_s.strip
      pub_date    = item.pubDate&.to_date || Date.today

      return nil if title.blank?

      # Skip stale articles
      return nil if pub_date < STALE_DAYS.days.ago.to_date

      full_text = "#{title} #{description}"
      dates = extract_event_date(full_text, pub_date)
      return nil unless dates

      # Skip events already in the past
      return nil if dates[:end] < Date.today

      location = extract_location(full_text) || 'Imperia'

      {
        title:       title,
        event_date:  dates[:start],
        end_date:    dates[:end] == dates[:start] ? nil : dates[:end],
        location:    location,
        description: description.presence || title,
        source_url:  link,
        source_name: SOURCE_NAME,
        category:    ['community'],
      }
    end

    def extract_event_date(text, pub_date)
      t = text.downcase

      # "domani" or "domani sera" → day after publication
      if t.match?(/\bdomani\b/)
        d = pub_date + 1
        return { start: d, end: d }
      end

      # "sabato e domenica", "questo weekend / fine settimana" → nearest Sat-Sun
      if t.match?(/fine\s+settimana|weekend/)
        return nearest_weekend(pub_date)
      end

      # Try explicit Italian date range or single date in the text
      parse_italian_date_range(text)
    end

    def extract_location(text)
      KNOWN_TOWNS.find { |town| text.match?(/\b#{Regexp.escape(town)}\b/i) }
    end

    def nearest_weekend(from_date)
      days_ahead = (6 - from_date.wday) % 7
      days_ahead = 7 if days_ahead.zero?
      saturday = from_date + days_ahead
      { start: saturday, end: saturday + 1 }
    end

    def strip_html(str)
      Nokogiri::HTML(str).text
    end
  end
end
