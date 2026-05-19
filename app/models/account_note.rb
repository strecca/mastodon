# frozen_string_literal: true

# == Schema Information
#
# Table name: account_notes
#
#  id                :bigint           not null, primary key
#  comment           :text             not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint           not null
#  target_account_id :bigint           not null
#
# Indexes
#
#  index_account_notes_on_account_id_and_target_account_id  (account_id,target_account_id) UNIQUE
#  index_account_notes_on_target_account_id                 (target_account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (target_account_id => accounts.id) ON DELETE => cascade
#
class AccountNote < ApplicationRecord
  include RelationshipCacheable

  COMMENT_SIZE_LIMIT = 2_000

  belongs_to :account
  belongs_to :target_account, class_name: 'Account'

  validates :account_id, uniqueness: { scope: :target_account_id }
  validates :comment, length: { maximum: COMMENT_SIZE_LIMIT }
end
