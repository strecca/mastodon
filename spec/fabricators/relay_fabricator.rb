# frozen_string_literal: true

# == Schema Information
#
# Table name: relays
#
#  id                 :bigint           not null, primary key
#  inbox_url          :string           default(""), not null
#  state              :integer          default("idle"), not null
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  follow_activity_id :string
#
Fabricator(:relay) do
  inbox_url { sequence(:inbox_url) { |i| "https://example.com/inboxes/#{i}" } }
  state :idle
end
