# frozen_string_literal: true

# == Schema Information
#
# Table name: community_my_people
#
#  id                :bigint           not null, primary key
#  account_id        :bigint           not null
#  member_account_id :bigint           not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#
# Indexes
#
#  idx_community_my_people_unique  (account_id, member_account_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#  fk_rails_...  (member_account_id => accounts.id)
#
class CommunityMyPerson < ApplicationRecord
  belongs_to :account
  belongs_to :member_account, class_name: 'Account', foreign_key: :member_account_id

  validates :member_account_id, uniqueness: { scope: :account_id }
  validate  :cannot_add_self

  private

  def cannot_add_self
    errors.add(:member_account_id, 'cannot add yourself') if account_id == member_account_id
  end
end
