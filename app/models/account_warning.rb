# frozen_string_literal: true

# == Schema Information
#
# Table name: account_warnings
#
#  id                :bigint           not null, primary key
#  action            :integer          default("none"), not null
#  overruled_at      :datetime
#  status_ids        :string           is an Array
#  text              :text             default(""), not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint
#  report_id         :bigint
#  target_account_id :bigint
#
# Indexes
#
#  index_account_warnings_on_account_id         (account_id)
#  index_account_warnings_on_target_account_id  (target_account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => nullify
#  fk_rails_...  (report_id => reports.id) ON DELETE => cascade
#  fk_rails_...  (target_account_id => accounts.id) ON DELETE => cascade
#

class AccountWarning < ApplicationRecord
  enum :action, {
    none: 0,
    disable: 1_000,
    mark_statuses_as_sensitive: 1_250,
    delete_statuses: 1_500,
    sensitive: 2_000,
    silence: 3_000,
    suspend: 4_000,
  }, suffix: :action

  APPEAL_WINDOW = 20.days
  RECENT_PERIOD = 3.months.freeze

  normalizes :text, with: ->(text) { text.to_s }, apply_to_nil: true

  belongs_to :account, inverse_of: :account_warnings
  belongs_to :target_account, class_name: 'Account', inverse_of: :strikes
  belongs_to :report, optional: true

  has_one :appeal, dependent: :destroy, inverse_of: :strike

  scope :latest, -> { order(id: :desc) }
  scope :custom, -> { where.not(text: '') }
  scope :recent, -> { where(created_at: RECENT_PERIOD.ago..) }

  def statuses
    Status.with_discarded.where(id: status_ids || [])
  end

  def overruled?
    overruled_at.present?
  end

  def appeal_eligible?
    created_at >= APPEAL_WINDOW.ago
  end

  def to_log_human_identifier
    target_account.acct
  end
end
