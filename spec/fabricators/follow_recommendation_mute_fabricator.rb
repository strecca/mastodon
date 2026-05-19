# frozen_string_literal: true

# == Schema Information
#
# Table name: follow_recommendation_mutes
#
#  id                :bigint           not null, primary key
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint           not null
#  target_account_id :bigint           not null
#
# Indexes
#
#  idx_on_account_id_target_account_id_a8c8ddf44e          (account_id,target_account_id) UNIQUE
#  index_follow_recommendation_mutes_on_target_account_id  (target_account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (target_account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:follow_recommendation_mute) do
  account { Fabricate.build(:account) }
  target_account { Fabricate.build(:account) }
end
