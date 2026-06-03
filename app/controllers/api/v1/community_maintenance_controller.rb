# frozen_string_literal: true

class Api::V1::CommunityMaintenanceController < Api::BaseController
  before_action :require_user!
  before_action :require_admin!

  SCRAPER_NAMES = %w[
    CentroItaliaEventsScraper
    ComuneSanLorenzoScraper
    LaVoceDiImperiaScraper
  ].freeze

  # GET /api/v1/community_maintenance/stats
  def stats
    today = Date.current

    render json: {
      events: {
        past:     CommunityEvent.where('event_date < ?', today).count,
        upcoming: CommunityEvent.where('event_date >= ?', today).count,
        pending:  CommunityEvent.where(status: :pending).count,
      },
      listings: {
        open:       CommunityListing.where(status: :open).count,
        fulfilled:  CommunityListing.where(status: :fulfilled).count,
        closed:     CommunityListing.where(status: :closed).count,
        stale:      CommunityListing.where(status: [:fulfilled, :closed])
                                    .where('updated_at < ?', 30.days.ago).count,
      },
      visits: {
        past:       CommunityVisit.where('departure_date < ?', today).count,
        active:     CommunityVisit.where('arrival_date <= ? AND departure_date >= ?', today, today).count,
        upcoming:   CommunityVisit.where('arrival_date > ?', today).count,
      },
      scrapers: ScraperRunLog.latest_per_source.map { |r| serialize_log(r) },
      storage: {
        protected_ids: protected_media_count,
        orphaned:      MediaAttachment.unattached.where('created_at < ?', 1.day.ago).count,
        log_entries:   ScraperRunLog.count,
        old_logs:      ScraperRunLog.where('ran_at < ?', 30.days.ago).count,
      },
    }
  end

  # DELETE /api/v1/community_maintenance/past_events
  # params: before (ISO date, default today)
  def past_events
    before = parse_date(params[:before]) || Date.current
    count  = CommunityEvent.where('event_date < ?', before).count
    CommunityEvent.where('event_date < ?', before).delete_all
    render json: { deleted: count, type: 'past_events' }
  end

  # DELETE /api/v1/community_maintenance/stale_listings
  # params: days (integer, default 30), statuses (array, default [fulfilled, closed])
  def stale_listings
    days     = [params[:days].to_i, 1].max rescue 30
    days     = 30 if days == 0
    statuses = Array(params[:statuses]).presence || %w[fulfilled closed]
    cutoff   = days.days.ago

    scope = CommunityListing.where(status: statuses).where('updated_at < ?', cutoff)
    count = scope.count
    scope.delete_all
    render json: { deleted: count, type: 'stale_listings' }
  end

  # DELETE /api/v1/community_maintenance/past_visits
  # params: before (ISO date, default today)
  def past_visits
    before = parse_date(params[:before]) || Date.current
    count  = CommunityVisit.where('departure_date < ?', before).count
    CommunityVisit.where('departure_date < ?', before).delete_all
    render json: { deleted: count, type: 'past_visits' }
  end

  # DELETE /api/v1/community_maintenance/scraper_logs
  # params: days (integer, default 30)
  def scraper_logs
    days  = [params[:days].to_i, 1].max rescue 30
    days  = 30 if days == 0
    count = ScraperRunLog.where('ran_at < ?', days.days.ago).count
    ScraperRunLog.where('ran_at < ?', days.days.ago).delete_all
    render json: { deleted: count, type: 'scraper_logs' }
  end

  # POST /api/v1/community_maintenance/run_scraper
  # params: scraper (scraper class name)
  def run_scraper
    name = params[:scraper].to_s
    return render json: { error: 'Unknown scraper' }, status: :unprocessable_entity unless SCRAPER_NAMES.include?(name)

    CommunityScraperWorker.perform_async(name)
    render json: { queued: name }
  end

  # POST /api/v1/community_maintenance/run_all_scrapers
  def run_all_scrapers
    Scheduler::EventImportScheduler.perform_async
    render json: { queued: 'all' }
  end

  # POST /api/v1/community_maintenance/run_vacuum
  def run_vacuum
    Scheduler::VacuumScheduler.perform_async
    render json: { queued: 'vacuum' }
  end

  private

  def require_admin!
    render json: { error: 'Admin access required' }, status: :forbidden unless current_user&.can?(:administrator)
  end

  def parse_date(value)
    Date.parse(value.to_s) if value.present?
  rescue Date::Error, ArgumentError
    nil
  end

  def protected_media_count
    conn   = ActiveRecord::Base.connection
    tables = conn.tables.select { |t| t.start_with?('community_') && conn.column_exists?(t, :image_media_ids) }
    return 0 if tables.empty?

    sql = tables.map { |t| "SELECT unnest(image_media_ids) FROM #{conn.quote_table_name(t)} WHERE image_media_ids IS NOT NULL AND image_media_ids != '{}'" }.join(' UNION ')
    conn.select_values("SELECT COUNT(*) FROM (#{sql}) AS ids").first.to_i
  end

  def serialize_log(log)
    {
      source:        log.source_name,
      ran_at:        log.ran_at&.iso8601,
      status:        log.status,
      fetched:       log.fetched,
      imported:      log.imported,
      skipped:       log.skipped,
      errors:        log.errors,
      error_message: log.error_message,
    }
  end
end
