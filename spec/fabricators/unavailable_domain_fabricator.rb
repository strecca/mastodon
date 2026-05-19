# frozen_string_literal: true

# == Schema Information
#
# Table name: unavailable_domains
#
#  id         :bigint           not null, primary key
#  domain     :string           default(""), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_unavailable_domains_on_domain  (domain) UNIQUE
#
Fabricator(:unavailable_domain) do
  domain { sequence(:domain) { |i| "#{i}#{Faker::Internet.domain_name}" } }
end
