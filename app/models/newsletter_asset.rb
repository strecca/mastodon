# frozen_string_literal: true

class NewsletterAsset < ApplicationRecord
  belongs_to :community_newsletter

  ROLES     = %w[sidebar_graphic editorial_photo footer_illustration header_graphic].freeze
  POSITIONS = %w[left_column right_column footer header].freeze

  validates :role,     inclusion: { in: ROLES }
  validates :position, inclusion: { in: POSITIONS }

  scope :ordered, -> { order(:display_order) }

  def image_url
    file_path.present? ? "/#{file_path.sub(%r{\A/}, '')}" : nil
  end

  def image_attached?
    file_path.present? && File.exist?(Rails.root.join('public', file_path.sub(%r{\A/}, '')))
  end
end
