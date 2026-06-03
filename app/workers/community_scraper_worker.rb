# frozen_string_literal: true

class CommunityScraperWorker
  include Sidekiq::Worker

  sidekiq_options retry: 0, queue: 'default'

  SCRAPER_MAP = {
    'CentroItaliaEventsScraper'  => Scrapers::CentroItaliaEventsScraper,
    'ComuneSanLorenzoScraper'    => Scrapers::ComuneSanLorenzoScraper,
    'LaVoceDiImperiaScraper'     => Scrapers::LaVoceDiImperiaScraper,
  }.freeze

  def perform(scraper_name)
    klass = SCRAPER_MAP[scraper_name]
    return Rails.logger.error("[CommunityScraperWorker] Unknown scraper: #{scraper_name}") unless klass

    source_name = klass::SOURCE_NAME
    began_at    = Time.current

    begin
      events = klass.new.fetch_events
      result = CommunityEventImportService.new.import(events)

      ScraperRunLog.create!(
        source_name:   source_name,
        ran_at:        began_at,
        fetched:       events.size,
        imported:      result[:imported],
        skipped:       result[:skipped],
        errors:        result[:errors],
        status:        events.empty? ? 'empty' : 'ok'
      )
    rescue StandardError => e
      ScraperRunLog.create!(
        source_name:   source_name,
        ran_at:        began_at,
        fetched:       0,
        imported:      0,
        skipped:       0,
        errors:        1,
        status:        'failed',
        error_message: e.message.truncate(500)
      )
    end
  end
end
