# frozen_string_literal: true

# == Schema Information
#
# Table name: email_domain_blocks
#
#  id                  :bigint           not null, primary key
#  allow_with_approval :boolean          default(FALSE), not null
#  domain              :string           default(""), not null
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  parent_id           :bigint
#
# Indexes
#
#  index_email_domain_blocks_on_domain  (domain) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (parent_id => email_domain_blocks.id) ON DELETE => cascade
#
Fabricator(:email_domain_block) do
  domain { sequence(:domain) { |i| "#{i}#{Faker::Internet.domain_name}" } }
end
