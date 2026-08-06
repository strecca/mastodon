# frozen_string_literal: true

class CommunityQuickShare < ApplicationRecord
  belongs_to :account

  validates :caption, presence: true
  validates :slug,    presence: true, uniqueness: true,
                      format: { with: /\A[a-z0-9-]+\z/, message: 'only lowercase letters, numbers, hyphens' }
  # pdf_path is deliberately not validated here -- it's only set via
  # update_column after the record already has an id (needed for the
  # storage path), same two-phase pattern as CommunityNewsletter's
  # original_pdf_path. The controller already rejects requests with no
  # uploaded file before a record is even built.

  before_validation :generate_slug, on: :create, if: -> { slug.blank? && caption.present? }

  def shared_as_post?
    mastodon_status_id.present?
  end

  private

  def generate_slug
    base = ActiveSupport::Inflector.transliterate(caption)
                .downcase
                .gsub(/[^a-z0-9\s-]/, '')
                .gsub(/\s+/, '-')
                .gsub(/-+/, '-')
                .strip.first(60)
    base = 'shared-file' if base.blank?

    candidate = base
    n = 2
    while CommunityQuickShare.exists?(slug: candidate)
      candidate = "#{base}-#{n}"
      n += 1
    end
    self.slug = candidate
  end
end
