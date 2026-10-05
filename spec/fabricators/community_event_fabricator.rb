# frozen_string_literal: true

Fabricator(:community_event) do
  account
  category ['Music']
  event_name 'Test Event'
  event_description 'A test event description'
  location_town_city 'Civezza'
  contact_info_1 'test@example.com'
  event_date { 1.week.from_now }
  status :approved
end
