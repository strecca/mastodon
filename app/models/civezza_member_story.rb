# frozen_string_literal: true

class CivezzaMemberStory < ApplicationRecord
  belongs_to :account

  validates :account_id, uniqueness: true

  scope :published, -> { where(published: true) }

  def image_media_ids
    self[:image_media_ids] || []
  end

  def image_media_attachments
    MediaAttachment.where(id: image_media_ids).index_by(&:id)
                   .values_at(*image_media_ids).compact
  end
end
