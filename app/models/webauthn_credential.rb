# frozen_string_literal: true

# == Schema Information
#
# Table name: webauthn_credentials
#
#  id          :bigint           not null, primary key
#  nickname    :string           not null
#  public_key  :string           not null
#  sign_count  :bigint           default(0), not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  external_id :string           not null
#  user_id     :bigint
#
# Indexes
#
#  index_webauthn_credentials_on_external_id           (external_id) UNIQUE
#  index_webauthn_credentials_on_user_id_and_nickname  (user_id,nickname) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#

class WebauthnCredential < ApplicationRecord
  SIGN_COUNT_LIMIT = (2**63)

  validates :external_id, :public_key, :nickname, :sign_count, presence: true
  validates :external_id, uniqueness: true
  validates :nickname, uniqueness: { scope: :user_id }
  validates :sign_count,
            numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than: SIGN_COUNT_LIMIT }
end
