# frozen_string_literal: true

# == Schema Information
#
# Table name: member_notification_targets
#
#  id                :bigint           not null, primary key
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint           not null
#  target_account_id :bigint           not null
#
# Indexes
#
#  idx_member_notif_targets_by_target  (target_account_id)
#  idx_member_notif_targets_unique     (account_id,target_account_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#  fk_rails_...  (target_account_id => accounts.id)
#
class MemberNotificationTarget < ApplicationRecord
  belongs_to :account
  belongs_to :target_account, class_name: 'Account'

  validates :target_account_id, uniqueness: { scope: :account_id }
  validate  :cannot_target_self

  private

  def cannot_target_self
    errors.add(:target_account_id, 'cannot target yourself') if account_id == target_account_id
  end
end
