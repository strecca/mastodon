# frozen_string_literal: true

class CommunityNewsletter < ApplicationRecord
  has_many :newsletter_assets, dependent: :destroy

  enum :status, { draft: 0, published: 1 }

  validates :title,       presence: true
  validates :author_name, presence: true
  validates :slug,        presence: true, uniqueness: true,
                          format: { with: /\A[a-z0-9-]+\z/, message: 'only lowercase letters, numbers, hyphens' }

  before_validation :generate_slug, on: :create, if: -> { slug.blank? && title.present? }

  scope :published_recent, -> { published.order(published_on: :desc) }
  scope :for_digest,       -> { published.where(published_on: 7.days.ago..) }

  def asset_for(role)
    newsletter_assets.find { |a| a.role == role.to_s }
  end

  def assets_for(role)
    newsletter_assets.select { |a| a.role == role.to_s }.sort_by(&:display_order)
  end

  def two_column?
    newsletter_template == 'two_column'
  end

  def digest_summary
    # First 300 chars of the right column (main article) for digest context
    (right_column_it.presence || left_column_it.to_s).truncate(300)
  end

  private

  def generate_slug
    base = ActiveSupport::Inflector.transliterate(title)
                .downcase
                .gsub(/[^a-z0-9\s-]/, '')
                .gsub(/\s+/, '-')
                .gsub(/-+/, '-')
                .strip.first(80)

    candidate = base
    n = 2
    while CommunityNewsletter.exists?(slug: candidate)
      candidate = "#{base}-#{n}"
      n += 1
    end
    self.slug = candidate
  end
end
