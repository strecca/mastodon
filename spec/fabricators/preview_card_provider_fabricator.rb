# frozen_string_literal: true

# == Schema Information
#
# Table name: preview_card_providers
#
#  id                  :bigint           not null, primary key
#  domain              :string           default(""), not null
#  icon_content_type   :string
#  icon_file_name      :string
#  icon_file_size      :bigint
#  icon_updated_at     :datetime
#  requested_review_at :datetime
#  reviewed_at         :datetime
#  trendable           :boolean
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#
# Indexes
#
#  index_preview_card_providers_on_domain  (domain) UNIQUE
#
Fabricator(:preview_card_provider) do
  domain { sequence(:domain) { |i| "#{i}#{Faker::Internet.domain_name}" } }
end
