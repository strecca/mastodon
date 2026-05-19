# frozen_string_literal: true

# == Schema Information
#
# Table name: favourites
#
#  id         :bigint           not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#  status_id  :bigint           not null
#
# Indexes
#
#  index_favourites_on_account_id_and_id         (account_id,id)
#  index_favourites_on_account_id_and_status_id  (account_id,status_id) UNIQUE
#  index_favourites_on_status_id                 (status_id)
#
# Foreign Keys
#
#  fk_5eb6c2b873  (account_id => accounts.id) ON DELETE => cascade
#  fk_b0e856845e  (status_id => statuses.id) ON DELETE => cascade
#

class Favourite < ApplicationRecord
  include Paginable
  include Favourite::FaspConcern

  update_index('statuses', :status)

  belongs_to :account, inverse_of: :favourites
  belongs_to :status,  inverse_of: :favourites

  has_one :notification, as: :activity, dependent: :destroy

  validates :status_id, uniqueness: { scope: :account_id }

  before_validation do
    self.status = status.reblog if status&.reblog?
  end

  after_create :increment_cache_counters
  after_destroy :decrement_cache_counters
  after_destroy :invalidate_cleanup_info

  private

  def increment_cache_counters
    status&.increment_count!(:favourites_count)
  end

  def decrement_cache_counters
    return if association(:status).loaded? && status.marked_for_destruction?

    status&.decrement_count!(:favourites_count)
  end

  def invalidate_cleanup_info
    return unless status&.account_id == account_id && account.local?

    account.statuses_cleanup_policy&.invalidate_last_inspected(status, :unfav)
  end
end
