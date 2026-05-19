# frozen_string_literal: true

# == Schema Information
#
# Table name: email_subscriptions
#
#  id                 :bigint           not null, primary key
#  confirmation_token :string
#  confirmed_at       :datetime
#  email              :string           not null
#  locale             :string           not null
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  account_id         :bigint           not null
#
# Indexes
#
#  index_email_subscriptions_on_account_id            (account_id)
#  index_email_subscriptions_on_account_id_and_email  (account_id,email) UNIQUE
#  index_email_subscriptions_on_confirmation_token    (confirmation_token) UNIQUE WHERE (confirmation_token IS NOT NULL)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:email_subscription) do
  account
  email { sequence(:email) { |i| "#{i}#{Faker::Internet.email}" } }
  locale 'en'
end
