# frozen_string_literal: true

require 'net/http'
require 'rss'

module Scrapers
  class BaseScraper
    TIMEOUT    = 15
    USER_AGENT = 'Mozilla/5.0 (compatible; MiacivezzaBot/1.0; +https://miacivezza.com)'

    ITALIAN_MONTHS = {
      'gennaio' => 1, 'febbraio' => 2, 'marzo' => 3, 'aprile' => 4,
      'maggio' => 5, 'giugno' => 6, 'luglio' => 7, 'agosto' => 8,
      'settembre' => 9, 'ottobre' => 10, 'novembre' => 11, 'dicembre' => 12,
    }.freeze

    # Returns Array<Hash>. Each hash:
    #   :title, :event_date (Date), :end_date (Date|nil),
    #   :location, :description, :source_url, :source_name,
    #   :website (optional), :contact (optional)
    def fetch_events
      raise NotImplementedError
    end

    protected

    def fetch_html(url, max_redirects: 5)
      uri = URI.parse(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl     = (uri.scheme == 'https')
      http.open_timeout = TIMEOUT
      http.read_timeout = TIMEOUT

      request = Net::HTTP::Get.new(uri.request_uri)
      request['User-Agent'] = USER_AGENT
      request['Accept']     = 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'

      response = http.request(request)

      case response.code.to_i
      when 200
        encoding = response.type_params['charset'] || 'UTF-8'
        body = response.body.force_encoding(encoding).encode('UTF-8', invalid: :replace, undef: :replace)
        Nokogiri::HTML(body)
      when 301, 302, 303, 307, 308
        return nil if max_redirects.zero?
        location = response['location']
        location = URI.join(url, location).to_s if location && !location.start_with?('http')
        fetch_html(location, max_redirects: max_redirects - 1) if location
      else
        Rails.logger.warn("[#{self.class.name}] HTTP #{response.code} for #{url}")
        nil
      end
    rescue StandardError => e
      Rails.logger.error("[#{self.class.name}] Fetch error #{url}: #{e.message}")
      nil
    end

    def fetch_rss(url)
      uri = URI.parse(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl     = (uri.scheme == 'https')
      http.open_timeout = TIMEOUT
      http.read_timeout = TIMEOUT
      response = http.get(uri.request_uri, 'User-Agent' => USER_AGENT)
      return nil unless response.code.to_i == 200

      RSS::Parser.parse(response.body, false)
    rescue StandardError => e
      Rails.logger.error("[#{self.class.name}] RSS error #{url}: #{e.message}")
      nil
    end

    # "Dal 29 Maggio al 31 Maggio 2026", "29 Maggio - 1 Giugno 2026",
    # "29 Maggio 2026", "sabato 29 maggio 2026"
    def parse_italian_date_range(text)
      return nil if text.blank?

      t = text.downcase.strip.gsub(/\s+/, ' ')

      # Range: "dal 29 maggio al 31 maggio 2026" or "29 maggio - 1 giugno 2026"
      range_re = /(?:dal?\s+)?(?:\w+\s+)?(\d{1,2})\s+(\w+)(?:\s+(\d{4}))?\s+(?:al?|-|–)\s+(?:\w+\s+)?(\d{1,2})\s+(\w+)\s+(\d{4})/
      if (m = t.match(range_re))
        year    = m[6].to_i
        s_month = ITALIAN_MONTHS[m[2]] or return nil
        e_month = ITALIAN_MONTHS[m[5]] or return nil
        s_year  = m[3].present? ? m[3].to_i : year
        return { start: Date.new(s_year, s_month, m[1].to_i),
                 end:   Date.new(year,   e_month, m[4].to_i) }
      end

      # Single day: "29 maggio 2026" (optional weekday prefix)
      single_re = /(?:\w+\s+)?(\d{1,2})\s+(\w+)\s+(\d{4})/
      if (m = t.match(single_re))
        month = ITALIAN_MONTHS[m[2]] or return nil
        d = Date.new(m[3].to_i, month, m[1].to_i)
        return { start: d, end: d }
      end

      nil
    rescue ArgumentError
      nil
    end

    # "04/04/2026" or "04/04/2026 - 06/04/2026"
    def parse_slash_date_range(text)
      return nil if text.blank?

      if (m = text.match(%r{(\d{1,2})/(\d{1,2})/(\d{4})\s*[-–]\s*(\d{1,2})/(\d{1,2})/(\d{4})}))
        { start: Date.new(m[3].to_i, m[2].to_i, m[1].to_i),
          end:   Date.new(m[6].to_i, m[5].to_i, m[4].to_i) }
      elsif (m = text.match(%r{(\d{1,2})/(\d{1,2})/(\d{4})}))
        d = Date.new(m[3].to_i, m[2].to_i, m[1].to_i)
        { start: d, end: d }
      end
    rescue ArgumentError
      nil
    end

    def clean_text(str)
      return nil if str.nil?
      str.gsub(/[[:space:]]+/, ' ').strip.presence
    end
  end
end
