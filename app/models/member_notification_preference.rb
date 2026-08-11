# frozen_string_literal: true

# == Schema Information
#
# Table name: member_notification_preferences
#
#  id                    :bigint           not null, primary key
#  email_frequency       :integer          default(2), not null
#  quiet_hours_enabled   :boolean          default(FALSE), not null
#  quiet_hours_end       :time
#  quiet_hours_start     :time
#  quiet_hours_timezone  :string           default("UTC"), not null
#  created_at            :datetime         not null
#  updated_at            :datetime         not null
#  account_id            :bigint           not null
#
# Indexes
#
#  index_member_notification_preferences_on_account_id  (account_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#
class MemberNotificationPreference < ApplicationRecord
  belongs_to :account

  enum :email_frequency, { never: 0, immediate: 1, digest: 2 }, default: :digest

  validates :account_id, uniqueness: true

  def self.for_account(account)
    find_or_initialize_by(account: account)
  end

  # True when `at` (default: now) falls inside this account's configured
  # quiet-hours window, in their chosen timezone. Handles windows that cross
  # midnight (e.g. 22:00–07:00).
  def in_quiet_hours?(at: Time.current)
    return false unless quiet_hours_enabled? && quiet_hours_start.present? && quiet_hours_end.present?

    local = at.in_time_zone(quiet_hours_timezone)
    now_seconds   = local.seconds_since_midnight
    start_seconds = quiet_hours_start.seconds_since_midnight
    end_seconds   = quiet_hours_end.seconds_since_midnight

    if start_seconds <= end_seconds
      now_seconds.between?(start_seconds, end_seconds)
    else
      now_seconds >= start_seconds || now_seconds <= end_seconds
    end
  end
end
