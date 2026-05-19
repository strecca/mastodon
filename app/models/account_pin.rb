# frozen_string_literal: true

# == Schema Information
#
# Table name: account_pins
#
#  id                :bigint           not null, primary key
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint           not null
#  target_account_id :bigint           not null
#
# Indexes
#
#  index_account_pins_on_account_id_and_target_account_id  (account_id,target_account_id) UNIQUE
#  index_account_pins_on_target_account_id                 (target_account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (target_account_id => accounts.id) ON DELETE => cascade
#

class AccountPin < ApplicationRecord
  include Paginable
  include RelationshipCacheable

  belongs_to :account
  belongs_to :target_account, class_name: 'Account'

  validate :validate_follow_relationship

  private

  def validate_follow_relationship
    errors.add(:base, I18n.t('accounts.pin_errors.following')) unless account&.following?(target_account)
  end
end
