# frozen_string_literal: true

class CivezzaMemberStory < ApplicationRecord
  include CommunityLiveRefresh

  community_live_refresh 'stories'

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
