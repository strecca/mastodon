# frozen_string_literal: true

Fabricator(:community_listing) do
  account
  title 'A test listing'
  listing_type 'giveaway'
  description 'A test description'
end
