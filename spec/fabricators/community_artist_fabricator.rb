# frozen_string_literal: true

Fabricator(:community_artist) do
  account
  category ['Sculptor']
  location_town_city 'Civezza'
  first_name 'Test'
  last_name 'Artist'
  artist_description 'A test artist description'
  contact_info_1 'test@example.com'
  status :approved
end
