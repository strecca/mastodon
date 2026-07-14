# frozen_string_literal: true

# Scrapes the Riviera24 eventi RSS feed.
#
# Feed URL: https://www.riviera24.it/tag/eventi/feed/
# (WordPress RSS 2.0 — redirects to cdn.riviera24.it; fetch_rss follows the redirect)
#
# Each RSS item is a news article tagged "eventi". Articles are not structured
# event records — dates and locations are embedded in the article body. This
# scraper extracts them via Italian-language date patterns (inherited from
# BaseScraper) and a known-towns lookup.
#
# Filtering rules (same as LaVoceDiImperiaScraper):
#   - Skip articles published more than STALE_DAYS ago (stale feed items)
#   - Skip events whose end date has already passed
#   - Skip events that started more than 7 days ago (avoids old recaps)

module Scrapers
  class Riviera24EventsScraper < BaseScraper
    SOURCE_NAME = 'Riviera24'
    RSS_URL     = 'https://www.riviera24.it/tag/eventi/feed/'
    STALE_DAYS  = 14

    # All municipalities and localities in the Imperia province area.
    # Order matters: more specific names (e.g. "Arma di Taggia") before
    # shorter ones ("Arma", "Taggia") so the first match wins.
    KNOWN_TOWNS = %w[
      Arma\ di\ Taggia
      Diano\ Castello
      Diano\ Marina
      Pieve\ di\ Teco
      Porto\ Maurizio
      San\ Lorenzo\ al\ Mare
      Santo\ Stefano\ al\ Mare
      Caramagna\ Ligure
      Bordighera
      Caravonica
      Cervo
      Chiusanico
      Cipressa
      Civezza
      Costarainera
      Dolcedo
      Imperia
      Lingueglietta
      Lucinasco
      Molini\ di\ Triora
      Oneglia
      Ospedaletti
      Pontedassio
      Riva\ Ligure
      Sanremo
      Taggia
      Triora
      Vallecrosia
      Ventimiglia
    ].freeze

    # ------------------------------------------------------------------ #
    # Public interface                                                      #
    # ------------------------------------------------------------------ #

    def fetch_events
      doc = fetch_rss(RSS_URL)
      return [] unless doc

      events = doc.css('item').filter_map { |item| parse_item(item) }
      Rails.logger.info("[Riviera24] Parsed #{events.size} usable events from RSS")
      events
    end

    # ------------------------------------------------------------------ #
    # Private                                                              #
    # ------------------------------------------------------------------ #

    private

    # Convert one RSS <item> into the hash format CommunityEventImportService
    # expects, or return nil to skip this item.
    def parse_item(item)
      title       = clean_text(item.at_xpath('title')&.text)
      description = clean_text(strip_html(item.at_xpath('description')&.text.to_s))
      full_text   = strip_html(item.at_css('encoded')&.text.to_s)
      link        = extract_link(item)
      pub_date    = parse_pub_date(item.at_xpath('pubDate')&.text)

      return nil if title.blank?

      # Drop articles that are too old to contain upcoming events
      return nil if pub_date < STALE_DAYS.days.ago.to_date

      # Search for a date in title + short description + full article body
      combined = "#{title} #{description} #{full_text}"
      dates = extract_event_date(combined, pub_date)
      return nil unless dates

      # Drop events that are entirely in the past
      return nil if dates[:end] < Date.today
      return nil if dates[:start] < (Date.today - 7)

      # Town appears in Riviera24 article titles ("Imperia, ..." / "A Sanremo ...")
      # and as the first word of the article body in bold. Search title first.
      location = extract_location(title) ||
                 extract_location(full_text) ||
                 'Provincia di Imperia'

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

    # WordPress RSS puts the article URL in a <link> text node that Nokogiri
    # sometimes returns as sibling text rather than child content.
    def extract_link(item)
      item.at_xpath('link')&.text&.strip.presence ||
        item.at_xpath('following-sibling::text()[normalize-space()]')&.text&.strip
    end

    def parse_pub_date(str)
      str ? (Time.parse(str).to_date rescue Date.today) : Date.today
    end

    # Looks for event dates inside a block of mixed Italian prose.
    # Delegates range/single-date parsing to BaseScraper helpers.
    def extract_event_date(text, pub_date)
      t = text.downcase

      # "domani" / "domani sera" → day after the article was published
      if t.match?(/\bdomani\b/)
        d = pub_date + 1
        return { start: d, end: d }
      end

      # "questo weekend" / "fine settimana" → nearest Saturday–Sunday
      if t.match?(/fine\s+settimana|weekend/)
        return nearest_weekend(pub_date)
      end

      # Explicit Italian date patterns: "Dal 5 agosto al 10 agosto 2026",
      # "sabato 19 luglio 2026", "19 e 20 ottobre", etc.
      parse_italian_date_range(text)
    end

    # Scan the text for any known municipality or locality name.
    # KNOWN_TOWNS is ordered longest-first so multi-word names match before
    # their shorter components.
    def extract_location(text)
      return nil if text.blank?
      KNOWN_TOWNS.find { |town| text.match?(/\b#{Regexp.escape(town)}\b/i) }
    end

    # Returns the nearest upcoming Saturday and Sunday relative to from_date.
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
