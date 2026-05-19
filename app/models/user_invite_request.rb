# frozen_string_literal: true

# == Schema Information
#
# Table name: user_invite_requests
#
#  id         :bigint           not null, primary key
#  text       :text
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :bigint           not null
#
# Indexes
#
#  index_user_invite_requests_on_user_id  (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#

class UserInviteRequest < ApplicationRecord
  TEXT_SIZE_LIMIT = 420

  belongs_to :user, inverse_of: :invite_request
  validates :text, presence: true, length: { maximum: TEXT_SIZE_LIMIT }
end
