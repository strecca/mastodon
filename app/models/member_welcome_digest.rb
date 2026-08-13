# frozen_string_literal: true

# == Schema Information
#
# Table name: member_welcome_digests
#
#  id          :bigint           not null, primary key
#  content     :text
#  digest_date :date             not null
#  viewed_at   :datetime
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  account_id  :bigint           not null
#
# Indexes
#
#  idx_member_welcome_digests_unique  (account_id,digest_date) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#
class MemberWelcomeDigest < ApplicationRecord
  belongs_to :account

  scope :unviewed, -> { where(viewed_at: nil) }

  def content?
    content.present?
  end

  def viewed?
    viewed_at.present?
  end

  def view!
    touch(:viewed_at) unless viewed?
  end
end
