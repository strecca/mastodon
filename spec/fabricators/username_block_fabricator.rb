# frozen_string_literal: true

# == Schema Information
#
# Table name: username_blocks
#
#  id                  :bigint           not null, primary key
#  allow_with_approval :boolean          default(FALSE), not null
#  exact               :boolean          default(FALSE), not null
#  normalized_username :string           not null
#  username            :string           not null
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#
# Indexes
#
#  index_username_blocks_on_normalized_username   (normalized_username)
#  index_username_blocks_on_username_lower_btree  (lower((username)::text)) UNIQUE
#
Fabricator(:username_block) do
  username { sequence(:email) { |i| "#{i}#{Faker::Internet.username}" } }
  exact false
  allow_with_approval false
end
