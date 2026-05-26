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
      # Try specific CMS selectors first, then fall back to any block with a date + heading
      candidates = doc.css('.notizia, .news-item, .evento, article, .list-item, [class*="notizia"], [class*="news"]')
      return candidates unless candidates.empty?

      # Broad fallback: divs that contain a DD/MM/YYYY date and an h3
      doc.css('div, section, li').select do |node|
        node.text.match?(%r{\d{2}/\d{2}/\d{4}}) && node.at_css('h3, h2')
      end
    end

    def parse_card(node)
      title = clean_text(node.at_css('h3, h2, .titolo, .title')&.text)
      return nil if title.blank?

      date_text = node.css('*').map(&:text).find { |t| t.match?(%r{\d{2}/\d{2}/\d{4}}) }
      dates = parse_slash_date_range(date_text)
      return nil unless dates

      return nil if dates[:end] < Date.today
      return nil if dates[:start] < (Date.today - 7)

      description = clean_text(
        node.at_css('p, .abstract, .descrizione')&.text
      ) || title

      # Build detail URL from link if available
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
