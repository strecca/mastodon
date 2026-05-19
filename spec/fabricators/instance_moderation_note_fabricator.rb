# frozen_string_literal: true

# == Schema Information
#
# Table name: instance_moderation_notes
#
#  id         :bigint           not null, primary key
#  content    :text
#  domain     :string           not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#
# Indexes
#
#  index_instance_moderation_notes_on_domain  (domain)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:instance_moderation_note) do
  domain { sequence(:domain) { |i| "#{i}#{Faker::Internet.domain_name}" } }
  account { Fabricate.build(:account) }
  content { Faker::Lorem.sentence }
end
