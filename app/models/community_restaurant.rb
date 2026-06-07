# frozen_string_literal: true

class CommunityRestaurant < ApplicationRecord
  CATEGORY_KEY = 'restaurants'

  include CommunitySearchable

  belongs_to :account
  has_many :entry_translations, class_name: 'CommunityEntryTranslation',
           as: :translatable, dependent: :destroy

  enum :status, { pending: 0, approved: 1, rejected: 2 }, default: :pending

  validates :name, presence: true
  validates :cuisine_type, presence: true
  validates :town, presence: true

  def image_media_attachments
    MediaAttachment.where(id: Array(image_media_ids))
  end
end
