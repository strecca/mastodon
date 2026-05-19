# frozen_string_literal: true

# == Schema Information
#
# Table name: webhooks
#
#  id         :bigint           not null, primary key
#  enabled    :boolean          default(TRUE), not null
#  events     :string           default([]), not null, is an Array
#  secret     :string           default(""), not null
#  template   :text
#  url        :string           not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_webhooks_on_url  (url) UNIQUE
#
Fabricator(:webhook) do
  url { Faker::Internet.url }
  secret { SecureRandom.hex }
  events { Webhook::EVENTS }
end
