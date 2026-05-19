# frozen_string_literal: true

# == Schema Information
#
# Table name: status_pins
#
#  id         :bigint           not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#  status_id  :bigint           not null
#
# Indexes
#
#  index_status_pins_on_account_id_and_status_id  (account_id,status_id) UNIQUE
#  index_status_pins_on_status_id                 (status_id)
#
# Foreign Keys
#
#  fk_d4cb435b62  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...   (status_id => statuses.id) ON DELETE => cascade
#

class StatusPin < ApplicationRecord
  belongs_to :account
  belongs_to :status

  validates_with StatusPinValidator

  after_destroy :invalidate_cleanup_info, if: %i(account_matches_status_account? account_local?)

  delegate :local?, to: :account, prefix: true

  private

  def invalidate_cleanup_info
    account.statuses_cleanup_policy&.invalidate_last_inspected(status, :unpin)
  end

  def account_matches_status_account?
    status&.account_id == account_id
  end
end
