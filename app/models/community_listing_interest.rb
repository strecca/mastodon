# frozen_string_literal: true

class CommunityListingInterest < ApplicationRecord
  belongs_to :community_listing
  belongs_to :account

  enum :status, {
    pending:   0,
    selected:  1,
    dismissed: 2,
  }

  validates :message, length: { maximum: 140 }
  validates :account_id, uniqueness: { scope: :community_listing_id,
                                       message: 'already expressed interest in this listing' }
end
