# frozen_string_literal: true

# == Schema Information
#
# Table name: users
#
#  id                        :bigint           not null, primary key
#  age_verified_at           :datetime
#  approved                  :boolean          default(TRUE), not null
#  chosen_languages          :string           is an Array
#  confirmation_sent_at      :datetime
#  confirmation_token        :string
#  confirmed_at              :datetime
#  consumed_timestep         :integer
#  current_sign_in_at        :datetime
#  disabled                  :boolean          default(FALSE), not null
#  email                     :string           default(""), not null
#  encrypted_password        :string           default(""), not null
#  last_emailed_at           :datetime
#  last_sign_in_at           :datetime
#  locale                    :string
#  otp_backup_codes          :string           is an Array
#  otp_required_for_login    :boolean          default(FALSE), not null
#  otp_secret                :string
#  require_tos_interstitial  :boolean          default(FALSE), not null
#  reset_password_sent_at    :datetime
#  reset_password_token      :string
#  settings                  :text
#  sign_in_count             :integer          default(0), not null
#  sign_in_token             :string
#  sign_in_token_sent_at     :datetime
#  sign_up_ip                :inet
#  time_zone                 :string
#  unconfirmed_email         :string
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  account_id                :bigint           not null
#  created_by_application_id :bigint
#  invite_id                 :bigint
#  role_id                   :bigint
#  webauthn_id               :string
#
# Indexes
#
#  index_users_on_account_id                 (account_id)
#  index_users_on_confirmation_token         (confirmation_token) UNIQUE
#  index_users_on_created_by_application_id  (created_by_application_id) WHERE (created_by_application_id IS NOT NULL)
#  index_users_on_email                      (email) UNIQUE
#  index_users_on_reset_password_token       (reset_password_token) UNIQUE WHERE (reset_password_token IS NOT NULL)
#  index_users_on_role_id                    (role_id) WHERE (role_id IS NOT NULL)
#  index_users_on_unconfirmed_email          (unconfirmed_email) WHERE (unconfirmed_email IS NOT NULL)
#
# Foreign Keys
#
#  fk_50500f500d  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...   (created_by_application_id => oauth_applications.id) ON DELETE => nullify
#  fk_rails_...   (invite_id => invites.id) ON DELETE => nullify
#  fk_rails_...   (role_id => user_roles.id) ON DELETE => nullify
#
Fabricator(:user) do
  account do |attrs|
    Fabricate.build(
      :account,
      attrs.fetch(:account_attributes, {}).merge(user: nil)
    )
  end
  email        { sequence(:email) { |i| "#{i}#{Faker::Internet.email}" } }
  password     '123456789'
  confirmed_at { Time.zone.now }
  current_sign_in_at { Time.zone.now }
  agreement true
end

Fabricator(:admin_user, from: :user) do
  role UserRole.find_by(name: 'Admin')
end

Fabricator(:moderator_user, from: :user) do
  role UserRole.find_by(name: 'Moderator')
end

Fabricator(:owner_user, from: :user) do
  role UserRole.find_by(name: 'Owner')
end

Fabricator(:private_user, from: :user) do
  account_attributes do
    { discoverable: false, locked: true, indexable: false }
  end
end
