# frozen_string_literal: true

Fabricator(:community_property) do
  account
  title 'Test Property'
  listing_type 'rent'
  property_type 'apartment'
  town 'Civezza'
  description 'A test property description'
  status :approved
end
