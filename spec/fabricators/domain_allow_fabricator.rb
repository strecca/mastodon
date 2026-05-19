# frozen_string_literal: true

# == Schema Information
#
# Table name: domain_allows
#
#  id         :bigint           not null, primary key
#  domain     :string           default(""), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_domain_allows_on_domain  (domain) UNIQUE
#
Fabricator(:domain_allow) do
  domain { sequence(:domain) { |i| "example#{i}.com" } }
end
