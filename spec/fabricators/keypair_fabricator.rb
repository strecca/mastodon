# frozen_string_literal: true

# == Schema Information
#
# Table name: keypairs
#
#  id          :bigint           not null, primary key
#  expires_at  :datetime
#  private_key :string
#  public_key  :string           not null
#  revoked     :boolean          default(FALSE), not null
#  type        :integer          not null
#  uri         :string           not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  account_id  :bigint           not null
#
# Indexes
#
#  index_keypairs_on_account_id  (account_id)
#  index_keypairs_on_uri         (uri) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
keypair     = OpenSSL::PKey::RSA.new(2048)
public_key  = keypair.public_key.to_pem
private_key = keypair.to_pem

Fabricator(:keypair) do
  account
  type        :rsa
  public_key  public_key
  expires_at  nil
  revoked     false

  after_build do |keypair|
    keypair.uri ||= ActivityPub::TagManager.instance.key_uri_for(keypair.account)
    keypair.private_key ||= private_key if keypair.account.local?
  end
end
