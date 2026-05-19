# frozen_string_literal: true

# == Schema Information
#
# Table name: account_migrations
#
#  id                :bigint           not null, primary key
#  acct              :string           default(""), not null
#  followers_count   :bigint           default(0), not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint
#  target_account_id :bigint
#
# Indexes
#
#  index_account_migrations_on_account_id         (account_id)
#  index_account_migrations_on_target_account_id  (target_account_id) WHERE (target_account_id IS NOT NULL)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (target_account_id => accounts.id) ON DELETE => nullify
#
Fabricator(:account_migration) do
  account
  target_account { |attrs| Fabricate(:account, also_known_as: [ActivityPub::TagManager.instance.uri_for(attrs[:account])]) }
  acct           { |attrs| attrs[:target_account].acct }
  followers_count 1234
  created_at { 60.days.ago }
end
