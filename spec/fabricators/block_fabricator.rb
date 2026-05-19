# frozen_string_literal: true

# == Schema Information
#
# Table name: blocks
#
#  id                :bigint           not null, primary key
#  uri               :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint           not null
#  target_account_id :bigint           not null
#
# Indexes
#
#  index_blocks_on_account_id_and_target_account_id  (account_id,target_account_id) UNIQUE
#  index_blocks_on_target_account_id                 (target_account_id)
#
# Foreign Keys
#
#  fk_4269e03e65  (account_id => accounts.id) ON DELETE => cascade
#  fk_9571bfabc1  (target_account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:block) do
  account { Fabricate.build(:account) }
  target_account { Fabricate.build(:account) }
end
