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

class AccountStat < ApplicationRecord
  self.locking_column = nil
  self.ignored_columns += %w(lock_version)

  belongs_to :account, inverse_of: :account_stat

  scope :by_recent_status, -> { order(arel_table[:last_status_at].desc.nulls_last) }
  scope :without_recent_activity, -> { where(last_status_at: [nil, ...1.month.ago]) }

  update_index('accounts', :account)

  def following_count
    [attributes['following_count'], 0].max
  end

  def followers_count
    [attributes['followers_count'], 0].max
  end

  def statuses_count
    [attributes['statuses_count'], 0].max
  end
end
