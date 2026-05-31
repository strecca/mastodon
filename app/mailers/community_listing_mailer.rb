# frozen_string_literal: true

class CommunityListingMailer < ApplicationMailer
  def interest_received(listing, interested_account, owner_email)
    @listing          = listing
    @interested       = interested_account
    @listing_url      = "#{root_url}community_listings/#{listing.id}"

    mail(
      to:      owner_email,
      subject: "#{@interested.display_name.presence || @interested.username} is interested in \"#{listing.title}\""
    )
  end
end
