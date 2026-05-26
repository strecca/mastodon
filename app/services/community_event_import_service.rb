# frozen_string_literal: true

# Imports a batch of scraped event hashes into community_events.
# Deduplication: skips if source_url already exists, or title+date already exist.
# All imported events are set to approved and attributed to the admin account.
class CommunityEventImportService
  def initialize
    @system_account = find_system_account
  end

  def import(events)
    unless @system_account
      Rails.logger.error('[EventImport] No admin account found — aborting import')
      return { imported: 0, skipped: 0, errors: 0 }
    end

    imported = 0
    skipped  = 0
    errors   = 0

    events.each do |attrs|
      if duplicate?(attrs)
        skipped += 1
        next
      end

      create_event(attrs)
      imported += 1
    rescue ActiveRecord::RecordInvalid => e
      errors += 1
      Rails.logger.error("[EventImport] Invalid record '#{attrs[:title]}': #{e.message}")
    rescue StandardError => e
      errors += 1
      Rails.logger.error("[EventImport] Error importing '#{attrs[:title]}': #{e.message}")
    end

    Rails.logger.info("[EventImport] Done — imported: #{imported}, skipped: #{skipped}, errors: #{errors}")
    { imported: imported, skipped: skipped, errors: errors }
  end

  private

  def find_system_account
    Account.find_by(username: 'admin') ||
      Account.joins(:user).merge(User.admins).first
  end

  def duplicate?(attrs)
    return true if attrs[:source_url].present? &&
                   CommunityEvent.exists?(source_url: attrs[:source_url])

    CommunityEvent.where(
      'LOWER(event_name) = LOWER(?) AND event_date::date = ?',
      attrs[:title].to_s,
      attrs[:event_date]
    ).exists?
  end

  def create_event(attrs)
    CommunityEvent.create!(
      account:            @system_account,
      event_name:         attrs[:title].to_s.truncate(255),
      event_description:  (attrs[:description] || attrs[:title]).to_s.truncate(5000),
      event_date:         attrs[:event_date].to_time,
      end_date:           attrs[:end_date]&.to_time,
      location_town_city: (attrs[:location] || 'Imperia').to_s.truncate(255),
      contact_info_1:     attrs[:contact]&.truncate(255),
      website:            attrs[:website]&.truncate(255),
      source_url:         attrs[:source_url]&.truncate(500),
      source_name:        attrs[:source_name]&.truncate(100),
      auto_imported:      true,
      status:             :approved,
      category:           Array(attrs[:category]).presence || ['community'],
    )
  end
end
