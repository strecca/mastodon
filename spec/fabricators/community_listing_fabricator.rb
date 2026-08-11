# frozen_string_literal: true

Fabricator(:community_listing) do
  account
  title 'A test listing'
  listing_type 'sell'
  description 'A test description'
end
