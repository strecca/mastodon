# frozen_string_literal: true

# == Schema Information
#
# Table name: notification_permissions
#
#  id              :bigint           not null, primary key
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  account_id      :bigint           not null
#  from_account_id :bigint           not null
#
# Indexes
#
#  index_notification_permissions_on_account_id       (account_id)
#  index_notification_permissions_on_from_account_id  (from_account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (from_account_id => accounts.id) ON DELETE => cascade
#
class NotificationPermission < ApplicationRecord
  belongs_to :account
  belongs_to :from_account, class_name: 'Account'
end
