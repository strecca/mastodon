# frozen_string_literal: true

# == Schema Information
#
# Table name: account_domain_blocks
#
#  id         :bigint           not null, primary key
#  domain     :string           not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#
# Indexes
#
#  index_account_domain_blocks_on_account_id_and_domain  (account_id,domain) UNIQUE
#
# Foreign Keys
#
#  fk_206c6029bd  (account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:account_domain_block) do
  account { Fabricate.build(:account) }
  domain { sequence { |n| "host-#{n}.example" } }
end
