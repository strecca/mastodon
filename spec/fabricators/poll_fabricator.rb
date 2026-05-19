# frozen_string_literal: true

# == Schema Information
#
# Table name: polls
#
#  id              :bigint           not null, primary key
#  cached_tallies  :bigint           default([]), not null, is an Array
#  expires_at      :datetime
#  hide_totals     :boolean          default(FALSE), not null
#  last_fetched_at :datetime
#  lock_version    :integer          default(0), not null
#  multiple        :boolean          default(FALSE), not null
#  options         :string           default([]), not null, is an Array
#  voters_count    :bigint
#  votes_count     :bigint           default(0), not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  account_id      :bigint           not null
#  status_id       :bigint           not null
#
# Indexes
#
#  index_polls_on_account_id  (account_id)
#  index_polls_on_status_id   (status_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (status_id => statuses.id) ON DELETE => cascade
#
Fabricator(:poll) do
  account { Fabricate.build(:account) }
  status { Fabricate.build(:status) }
  expires_at  { 7.days.from_now }
  options     %w(Foo Bar)
  multiple    false
  hide_totals false
end
