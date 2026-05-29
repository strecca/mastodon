# frozen_string_literal: true

# Runs nightly (02:00 local server time) via sidekiq-scheduler.
# Scrapes Imperia-area event sources and imports new public events.
# Each scraper is run individually so results are logged per source.
class Scheduler::EventImportScheduler
  include Sidekiq::Worker

  sidekiq_options retry: 0, lock: :until_executed, lock_ttl: 2.hours.to_i, queue: 'scheduler'

  SCRAPERS = [
    Scrapers::CentroItaliaEventsScraper,
    Scrapers::ComuneSanLorenzoScraper,
    Scrapers::LaVoceDiImperiaScraper,
  ].freeze

  def perform
    Rails.logger.info('[EventImport] Starting nightly event import')

    total_imported = 0
    total_skipped  = 0

    SCRAPERS.each do |klass|
      source_name = klass::SOURCE_NAME
      began_at    = Time.current

      begin
        events = klass.new.fetch_events
        Rails.logger.info("[EventImport] #{source_name}: fetched #{events.size} events")

        result = CommunityEventImportService.new.import(events)
        total_imported += result[:imported]
        total_skipped  += result[:skipped]

        ScraperRunLog.create!(
          source_name:   source_name,
          ran_at:        began_at,
          fetched:       events.size,
          imported:      result[:imported],
          skipped:       result[:skipped],
          errors:        result[:errors],
          status:        events.empty? ? 'empty' : 'ok',
        )
      rescue StandardError => e
        Rails.logger.error("[EventImport] #{source_name} failed: #{e.message}")
        ScraperRunLog.create!(
          source_name:   source_name,
          ran_at:        began_at,
          fetched:       0,
          imported:      0,
          skipped:       0,
          errors:        1,
          status:        'failed',
          error_message: e.message.truncate(500),
        )
      end
    end

    Rails.logger.info("[EventImport] Done — total imported: #{total_imported}, skipped: #{total_skipped}")
  end
end
