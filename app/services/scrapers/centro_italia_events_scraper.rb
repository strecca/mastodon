# frozen_string_literal: true

module Scrapers
  class CentroItaliaEventsScraper < BaseScraper
    SOURCE_NAME   = 'CentroItaliaEvents'
    LISTING_URL   = 'https://www.centroitaliaevents.it/liguria/imperia/'
    BASE_URL      = 'https://www.centroitaliaevents.it'
    MAX_EVENTS    = 40
    SLEEP_SECONDS = 1

    ITALIAN_DATE_RE = /\b\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/i

    def fetch_events
      doc = fetch_html(LISTING_URL)
      return [] unless doc

      links = extract_event_links(doc)
      Rails.logger.info("[CentroItaliaEvents] Found #{links.size} event links on listing page")

      events = []
      links.first(MAX_EVENTS).each do |href|
        url = href.start_with?('http') ? href : "#{BASE_URL}#{href}"
        event = scrape_detail(url)
        events << event if event
        sleep SLEEP_SECONDS
      end

      Rails.logger.info("[CentroItaliaEvents] Scraped #{events.size} valid events")
      events
    end

    private

    def extract_event_links(doc)
      doc.css('a[href]')
         .map { |a| a['href'].to_s.strip }
         .select { |h| h.match?(%r{\A/liguria/imperia/[^/]+/[^/]+\.html\z}) }
         .uniq
    end

    def scrape_detail(url)
      doc = fetch_html(url)
      return nil unless doc

      title = extract_title(doc)
      return nil if title.blank?

      date_text = find_date_text(doc)
      dates = parse_italian_date_range(date_text)
      return nil unless dates

      # Only import present/future events
      return nil if dates[:end] < Date.today

      location = extract_location(doc, url)
      description = extract_description(doc) || title

      website = doc.css('a[href^="http"]')
                   .map { |a| a['href'] }
                   .reject { |h| h.include?('centroitaliaevents') }
                   .first

      {
        title:       title,
        event_date:  dates[:start],
        end_date:    dates[:end] == dates[:start] ? nil : dates[:end],
        location:    location,
        description: description,
        source_url:  url,
        source_name: SOURCE_NAME,
        website:     website,
        category:    ['community'],
      }
    end

    def extract_title(doc)
      clean_text(
        doc.at_css('h1')&.text ||
        doc.at_css('h2.titolo, .event-title, .titolo-evento')&.text ||
        doc.at_css('[class*="titolo"]')&.text
      )
    end

    def find_date_text(doc)
      # Try common date container selectors
      %w[.data .date .periodo .dates [class*="data"] [class*="date"] [class*="periodo"]].each do |sel|
        node = doc.at_css(sel)
        next unless node

        text = node.text
        return text if text.match?(ITALIAN_DATE_RE)
      end

      # Scan all visible text for an Italian date range
      doc.text.scan(
        /(?:dal?\s+)?\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+\d{4}/i
      ).first
    end

    def extract_location(doc, url)
      # Try explicit location elements
      from_element = clean_text(
        doc.at_css('.luogo, .location, .comune, [class*="luogo"], [class*="location"]')&.text
      )
      return from_element if from_element.present?

      # Derive city from URL: /liguria/imperia/san-lorenzo-al-mare/slug.html → "San Lorenzo al Mare"
      city_slug = URI.parse(url).path.split('/')[3]
      city_slug&.split('-')&.map(&:capitalize)&.join(' ') || 'Imperia'
    end

    def extract_description(doc)
      # Prefer a dedicated description block
      desc = doc.at_css('.descrizione, .description, .testo, [class*="descrizione"], [class*="description"]')&.text
      return clean_text(desc) if desc.present?

      # Fall back to the longest paragraph on the page
      clean_text(
        doc.css('p')
           .map(&:text)
           .map { |t| t.strip.gsub(/\s+/, ' ') }
           .reject { |t| t.length < 40 }
           .max_by(&:length)
      )
    end
  end
end
