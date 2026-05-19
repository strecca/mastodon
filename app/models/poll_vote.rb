# frozen_string_literal: true

# == Schema Information
#
# Table name: poll_votes
#
#  id         :bigint           not null, primary key
#  choice     :integer          default(0), not null
#  uri        :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#  poll_id    :bigint           not null
#
# Indexes
#
#  index_poll_votes_on_account_id  (account_id)
#  index_poll_votes_on_poll_id     (poll_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (poll_id => polls.id) ON DELETE => cascade
#

class PollVote < ApplicationRecord
  belongs_to :account
  belongs_to :poll, inverse_of: :votes

  validates :choice, presence: true
  validates_with VoteValidator

  after_create_commit :increment_counter_cache

  delegate :local?, to: :account
  delegate :multiple?, :expired?, to: :poll, prefix: true

  def object_type
    :vote
  end

  private

  def increment_counter_cache
    poll.cached_tallies[choice] = (poll.cached_tallies[choice] || 0) + 1
    poll.save
  rescue ActiveRecord::StaleObjectError
    poll.reload
    retry
  end
end
