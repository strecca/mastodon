# frozen_string_literal: true

# == Schema Information
#
# Table name: identities
#
#  id         :bigint           not null, primary key
#  provider   :string           default(""), not null
#  uid        :string           default(""), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :bigint
#
# Indexes
#
#  index_identities_on_uid_and_provider  (uid,provider) UNIQUE
#  index_identities_on_user_id           (user_id)
#
# Foreign Keys
#
#  fk_bea040f377  (user_id => users.id) ON DELETE => cascade
#
Fabricator(:identity) do
  user { Fabricate.build(:user) }
  provider 'MyString'
  uid { sequence(:uid) { |i| "uid_string_#{i}" } }
end
