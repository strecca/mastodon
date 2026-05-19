# frozen_string_literal: true

# == Schema Information
#
# Table name: list_accounts
#
#  id                :bigint           not null, primary key
#  account_id        :bigint           not null
#  follow_id         :bigint
#  follow_request_id :bigint
#  list_id           :bigint           not null
#
# Indexes
#
#  index_list_accounts_on_account_id_and_list_id  (account_id,list_id) UNIQUE
#  index_list_accounts_on_follow_id               (follow_id) WHERE (follow_id IS NOT NULL)
#  index_list_accounts_on_follow_request_id       (follow_request_id) WHERE (follow_request_id IS NOT NULL)
#  index_list_accounts_on_list_id_and_account_id  (list_id,account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (follow_id => follows.id) ON DELETE => cascade
#  fk_rails_...  (follow_request_id => follow_requests.id) ON DELETE => cascade
#  fk_rails_...  (list_id => lists.id) ON DELETE => cascade
#

class ListAccount < ApplicationRecord
  belongs_to :list
  belongs_to :account
  belongs_to :follow, optional: true
  belongs_to :follow_request, optional: true

  validates :account_id, uniqueness: { scope: :list_id }
  validate :validate_relationship

  scope :active, -> { where.not(follow_id: nil) }

  before_validation :set_follow, unless: :list_owner_account_is_account?

  private

  def set_follow
    self.follow = Follow.find_by(account_id: list.account_id, target_account_id: account.id)
    self.follow_request = FollowRequest.find_by(account_id: list.account_id, target_account_id: account.id) if follow.nil?
  end

  def validate_relationship
    return if list_owner_account_is_account?

    errors.add(:account_id, :must_be_following) if follow_id.nil? && follow_request_id.nil?
    errors.add(:follow, :invalid) if follow_id.present? && follow.target_account_id != account_id
    errors.add(:follow_request, :invalid) if follow_request_id.present? && follow_request.target_account_id != account_id
  end

  def list_owner_account_is_account?
    list.account_id == account_id
  end
end
