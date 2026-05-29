# frozen_string_literal: true

module Scrapers
  class ComuneSanLorenzoScraper < BaseScraper
    SOURCE_NAME  = 'Comune di San Lorenzo al Mare'
    LISTING_URL  = 'https://www.comune.sanlorenzoalmare.im.it/Eventi'
    BASE_URL     = 'https://www.comune.sanlorenzoalmare.im.it'
    LOCATION     = 'San Lorenzo al Mare'

    def fetch_events
      doc = fetch_html(LISTING_URL)
      return [] unless doc

      # The Siscom CMS renders events as repeating card blocks.
      # Each card has: category link, date range, h3 title, description paragraph, image.
      # We look for any container that holds both a date pattern and an h3.
      cards = find_event_cards(doc)
      Rails.logger.info("[ComuneSanLorenzo] Found #{cards.size} candidate cards")

      cards.filter_map { |card| parse_card(card) }
    end

    private

    def find_event_cards(doc)
      # Anchor on date spans (span.data or span[class*="data"] containing DD/MM/YYYY),
      # then walk up the DOM to find the enclosing event card container.
      date_spans = doc.css('span.data, span[class*="data"]').select do |s|
        s.text.strip.match?(%r{\d{2}/\d{2}/\d{4}})
      end

      return [] if date_spans.empty?

      date_spans.filter_map do |span|
        node = span
        5.times do
          parent = node.parent
          break if parent.nil? || parent.name == 'body'
          node = parent
          # Stop once we have a heading or a descriptive link alongside the date
          break if node.at_css('h2, h3, h4') || (node.css('a').size > 1)
        end
        node if node.name != 'body' && node.name != 'html' && node != span
      end.uniq(&:object_id)
    end

    def parse_card(node)
      title = clean_text(node.at_css('h3, h2, h4, .titolo, .title')&.text ||
                         node.at_css('a')&.text)
      return nil if title.blank?

      # Prefer the explicit date span, fall back to any text matching DD/MM/YYYY
      date_text = node.at_css('span.data, span[class*="data"]')&.text ||
                  node.css('*').map(&:text).find { |t| t.match?(%r{\d{2}/\d{2}/\d{4}}) }
      dates = parse_slash_date_range(date_text)
      return nil unless dates

      return nil if dates[:end] < Date.today
      return nil if dates[:start] < (Date.today - 7)

      description = clean_text(
        node.at_css('p, .abstract, .descrizione')&.text
      ) || title

      href = node.at_css('a[href*="Dettaglio"], a[href*="IDNews"], a[href]')&.[]('href')
      url  = if href
               href.start_with?('http') ? href : "#{BASE_URL}/#{href.sub(%r{\A/}, '')}"
             else
               LISTING_URL
             end

      {
        title:       title,
        event_date:  dates[:start],
        end_date:    dates[:end] == dates[:start] ? nil : dates[:end],
        location:    LOCATION,
        description: description,
        source_url:  url,
        source_name: SOURCE_NAME,
        category:    ['community'],
      }
    end
  end
end
