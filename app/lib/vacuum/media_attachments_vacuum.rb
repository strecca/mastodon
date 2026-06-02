# frozen_string_literal: true

class Vacuum::MediaAttachmentsVacuum
  TTL = 1.day.freeze

  def initialize(retention_period)
    @retention_period = retention_period
  end

  def perform
    vacuum_orphaned_records!
    vacuum_cached_files! if retention_period?
  end

  private

  def vacuum_cached_files!
    media_attachments_past_retention_period.find_in_batches do |media_attachments|
      AttachmentBatch.new(MediaAttachment, media_attachments).clear
    rescue => e
      Rails.logger.error("Skipping batch while removing cached media attachments due to error: #{e}")
    end
  end

  def vacuum_orphaned_records!
    orphaned_media_attachments.find_in_batches do |media_attachments|
      AttachmentBatch.new(MediaAttachment, media_attachments).delete
    rescue => e
      Rails.logger.error("Skipping batch while removing orphaned media attachments due to error: #{e}")
    end
  end

  def media_attachments_past_retention_period
    MediaAttachment
      .remote
      .cached
      .created_before(@retention_period.ago)
      .updated_before(@retention_period.ago)
  end

  def orphaned_media_attachments
    scope = MediaAttachment.unattached.created_before(TTL.ago)
    sql   = community_image_media_ids_sql
    sql ? scope.where("id NOT IN (#{sql})") : scope
  end

  def community_image_media_ids_sql
    conn   = ActiveRecord::Base.connection
    tables = conn.tables.select { |t| t.start_with?('community_') && conn.column_exists?(t, :image_media_ids) }
    return nil if tables.empty?

    tables.map { |t|
      "SELECT unnest(image_media_ids) FROM #{conn.quote_table_name(t)} WHERE image_media_ids IS NOT NULL AND image_media_ids != '{}'"
    }.join(' UNION ')
  end

  def retention_period?
    @retention_period.present?
  end
end
