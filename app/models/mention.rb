# frozen_string_literal: true

# == Schema Information
#
# Table name: mentions
#
#  id         :bigint           not null, primary key
#  silent     :boolean          default(FALSE), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#  status_id  :bigint           not null
#
# Indexes
#
#  index_mentions_on_account_id_and_status_id  (account_id,status_id) UNIQUE
#  index_mentions_on_status_id                 (status_id)
#
# Foreign Keys
#
#  fk_970d43f9d1  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...   (status_id => statuses.id) ON DELETE => cascade
#

class Mention < ApplicationRecord
  belongs_to :account, inverse_of: :mentions
  belongs_to :status

  has_one :notification, as: :activity, dependent: :destroy

  validates :account_id, uniqueness: { scope: :status_id }

  scope :active, -> { where(silent: false) }
  scope :silent, -> { where(silent: true) }

  delegate(
    :username,
    :acct,
    to: :account,
    prefix: true
  )
end
