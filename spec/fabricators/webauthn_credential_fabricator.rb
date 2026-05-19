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
Fabricator(:webauthn_credential) do
  user_id { Fabricate(:user).id }
  external_id { Base64.urlsafe_encode64(SecureRandom.random_bytes(16)) }
  public_key { OpenSSL::PKey::EC.generate('prime256v1').public_key }
  nickname { sequence(:nickname) { |i| "USB Key number #{i}" } }
  sign_count 0
end
