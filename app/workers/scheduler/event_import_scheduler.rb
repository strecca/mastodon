# frozen_string_literal: true

# Runs nightly (02:00 local server time) via sidekiq-scheduler.
# Scrapes Imperia-area event sources and imports new public events.
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

    all_events = SCRAPERS.flat_map do |klass|
      klass.new.fetch_events
    rescue StandardError => e
      Rails.logger.error("[EventImport] Scraper #{klass.name} failed: #{e.message}")
      []
    end

    Rails.logger.info("[EventImport] Total events fetched across all sources: #{all_events.size}")

    result = CommunityEventImportService.new.import(all_events)
    Rails.logger.info("[EventImport] Result: #{result.inspect}")
  end
end
