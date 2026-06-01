# frozen_string_literal: true

class AddTrigramSearchIndexesToCommunityTables < ActiveRecord::Migration[7.2]
  def up
    safety_assured do
      enable_extension 'pg_trgm'

      # ── community_artists ───────────────────────────────────────────────────
      execute <<~SQL
        CREATE INDEX idx_community_artists_search_trgm
          ON community_artists
          USING gin (
            lower(
              coalesce(first_name,'') || ' ' ||
              coalesce(last_name,'')  || ' ' ||
              coalesce(location_town_city,'') || ' ' ||
              coalesce(artist_description,'')
            ) gin_trgm_ops
          )
          WHERE status = 1;
      SQL

      execute "CREATE INDEX idx_community_artists_approved_newest  ON community_artists (created_at DESC) WHERE status = 1;"
      execute "CREATE INDEX idx_community_artists_approved_oldest  ON community_artists (created_at ASC)  WHERE status = 1;"
      execute "CREATE INDEX idx_community_artists_approved_az      ON community_artists (first_name ASC)  WHERE status = 1;"
      execute "CREATE INDEX idx_community_artists_approved_updated ON community_artists (updated_at DESC) WHERE status = 1;"

      # ── community_events ────────────────────────────────────────────────────
      execute <<~SQL
        CREATE INDEX idx_community_events_search_trgm
          ON community_events
          USING gin (
            lower(
              coalesce(event_name,'')         || ' ' ||
              coalesce(location_town_city,'') || ' ' ||
              coalesce(event_description,'')
            ) gin_trgm_ops
          )
          WHERE status = 1;
      SQL

      execute "CREATE INDEX idx_community_events_approved_upcoming ON community_events (event_date ASC)   WHERE status = 1;"
      execute "CREATE INDEX idx_community_events_approved_past     ON community_events (event_date DESC)  WHERE status = 1;"
      execute "CREATE INDEX idx_community_events_approved_newest   ON community_events (created_at DESC)  WHERE status = 1;"
      execute "CREATE INDEX idx_community_events_approved_az       ON community_events (event_name ASC)   WHERE status = 1;"

      # ── community_listings ──────────────────────────────────────────────────
      # status=0 → open (publicly visible)
      execute <<~SQL
        CREATE INDEX idx_community_listings_search_trgm
          ON community_listings
          USING gin (
            lower(
              coalesce(title,'')       || ' ' ||
              coalesce(description,'')
            ) gin_trgm_ops
          )
          WHERE status = 0;
      SQL

      execute "CREATE INDEX idx_community_listings_open_recent ON community_listings (created_at DESC) WHERE status = 0;"
    end
  end

  def down
    safety_assured do
      execute "DROP INDEX IF EXISTS idx_community_artists_search_trgm;"
      execute "DROP INDEX IF EXISTS idx_community_artists_approved_newest;"
      execute "DROP INDEX IF EXISTS idx_community_artists_approved_oldest;"
      execute "DROP INDEX IF EXISTS idx_community_artists_approved_az;"
      execute "DROP INDEX IF EXISTS idx_community_artists_approved_updated;"
      execute "DROP INDEX IF EXISTS idx_community_events_search_trgm;"
      execute "DROP INDEX IF EXISTS idx_community_events_approved_upcoming;"
      execute "DROP INDEX IF EXISTS idx_community_events_approved_past;"
      execute "DROP INDEX IF EXISTS idx_community_events_approved_newest;"
      execute "DROP INDEX IF EXISTS idx_community_events_approved_az;"
      execute "DROP INDEX IF EXISTS idx_community_listings_search_trgm;"
      execute "DROP INDEX IF EXISTS idx_community_listings_open_recent;"
      disable_extension 'pg_trgm'
    end
  end
end
