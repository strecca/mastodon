# frozen_string_literal: true

class NewsletterAsset < ApplicationRecord
  belongs_to :community_newsletter

  has_one_attached :image

  ROLES = %w[sidebar_graphic editorial_photo footer_illustration header_graphic].freeze
  POSITIONS = %w[left_column right_column footer header].freeze

  validates :role,     inclusion: { in: ROLES }
  validates :position, inclusion: { in: POSITIONS }

  scope :ordered, -> { order(:display_order) }

  def image_url(variant = nil)
    return nil unless image.attached?

    if variant
      rails_representation_url(image.variant(variant), host: Rails.configuration.x.web_domain)
    else
      rails_blob_url(image, host: Rails.configuration.x.web_domain)
    end
  end
end
