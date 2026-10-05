# frozen_string_literal: true

Fabricator(:community_service) do
  account
  name 'Test Service'
  category ['Plumbing']
  town 'Civezza'
  description 'A test service description'
  status :approved
end
