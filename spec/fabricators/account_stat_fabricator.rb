# frozen_string_literal: true

# == Schema Information
#
# Table name: account_stats
#
#  id              :bigint           not null, primary key
#  followers_count :bigint           default(0), not null
#  following_count :bigint           default(0), not null
#  last_status_at  :datetime
#  statuses_count  :bigint           default(0), not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  account_id      :bigint           not null
#
# Indexes
#
#  index_account_stats_on_account_id                     (account_id) UNIQUE
#  index_account_stats_on_last_status_at_and_account_id  (last_status_at DESC NULLS LAST,account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:account_stat) do
  account { Fabricate.build(:account) }
  statuses_count  '123'
  following_count '456'
  followers_count '789'
end
