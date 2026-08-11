# frozen_string_literal: true

# == Schema Information
#
# Table name: member_notification_category_subscriptions
#
#  id            :bigint           not null, primary key
#  category_key  :string           not null
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  account_id    :bigint           not null
#
# Indexes
#
#  idx_member_notif_category_subs_by_category  (category_key)
#  idx_member_notif_category_subs_unique       (account_id,category_key) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#
class MemberNotificationCategorySubscription < ApplicationRecord
  belongs_to :account

  validates :category_key, presence: true, uniqueness: { scope: :account_id }
end
