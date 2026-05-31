# frozen_string_literal: true

# Notifies a listing owner that someone expressed interest.
class CommunityListingNotifyWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'default', retry: 3

  def perform(listing_id, interested_account_id)
    listing  = CommunityListing.includes(:account).find(listing_id)
    owner    = listing.account
    interest = Account.find(interested_account_id)

    owner_email = User.find_by(account: owner)&.email
    return unless owner_email.present?

    CommunityListingMailer.interest_received(listing, interest, owner_email).deliver_later
  rescue ActiveRecord::RecordNotFound
    # listing or account deleted — nothing to do
  end
end
