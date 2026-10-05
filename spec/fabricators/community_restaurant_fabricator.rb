# frozen_string_literal: true

Fabricator(:community_restaurant) do
  account
  name 'Test Restaurant'
  cuisine_type ['Italian']
  town 'Civezza'
  status :approved
end
