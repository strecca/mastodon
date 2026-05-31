# frozen_string_literal: true

class CommunityListing < ApplicationRecord
  belongs_to :account

  has_many :community_listing_interests, dependent: :destroy
  has_many_attached :images

  enum :listing_type, {
    giveaway: 0,
    trade:    1,
    sell:     2,
    rent:     3,
    iso:      4,
  }

  enum :condition_value, {
    new_item:  0,
    like_new:  1,
    used:      2,
    damaged:   3,
  }, prefix: :condition

  enum :status, {
    open:      0,
    fulfilled: 1,
    closed:    2,
  }

  validates :title,        presence: true, length: { maximum: 120 }
  validates :listing_type, presence: true
  validates :description,  length: { maximum: 2000 }
  validates :trade_for,    length: { maximum: 500 }
  validates :rental_period, length: { maximum: 100 }
  validates :price,        numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :images, content_type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
                     size: { less_than: 8.megabytes }

  validate :price_required_for_sell_and_rent
  validate :image_count_limit

  scope :publicly_visible, -> { where(status: :open) }
  scope :recent,           -> { order(created_at: :desc) }
  scope :by_type,          ->(t) { where(listing_type: t) if t.present? }

  def interest_count
    community_listing_interests.count
  end

  def interested?(account)
    community_listing_interests.exists?(account: account)
  end

  private

  def price_required_for_sell_and_rent
    return unless sell? || rent?
    errors.add(:price, 'is required for sell and rent listings') if price.blank?
  end

  def image_count_limit
    errors.add(:images, 'maximum 4 images per listing') if images.length > 4
  end
end
