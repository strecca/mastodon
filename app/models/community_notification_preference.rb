# frozen_string_literal: true

# == Schema Information
#
# Table name: community_notification_preferences
#
#  id               :bigint           not null, primary key
#  browser_push     :boolean          default(FALSE), not null
#  email_frequency  :integer          default("daily_digest"), not null
#  on_friend_ping   :boolean          default(TRUE), not null
#  on_new_member    :boolean          default(FALSE), not null
#  on_visit_overlap :boolean          default(TRUE), not null
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  account_id       :bigint           not null
#
# Indexes
#
#  idx_community_notif_prefs_account                       (account_id) UNIQUE
#  index_community_notification_preferences_on_account_id  (account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#
class CommunityNotificationPreference < ApplicationRecord
  belongs_to :account

  enum :email_frequency, {
    never:        0,
    immediate:    1,
    daily_digest: 2,
    weekly_digest: 3,
  }, default: :daily_digest

  validates :account_id, uniqueness: true

  # Returns the preference row for an account, creating defaults if none exists yet
  def self.for_account(account)
    find_or_initialize_by(account: account)
  end
end
