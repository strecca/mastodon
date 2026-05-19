# frozen_string_literal: true

# == Schema Information
#
# Table name: terms_of_services
#
#  id                   :bigint           not null, primary key
#  changelog            :text             default(""), not null
#  effective_date       :date
#  notification_sent_at :datetime
#  published_at         :datetime
#  text                 :text             default(""), not null
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#
# Indexes
#
#  index_terms_of_services_on_effective_date  (effective_date) UNIQUE WHERE (effective_date IS NOT NULL)
#
Fabricator(:terms_of_service) do
  text { Faker::Lorem.paragraph }
  changelog { Faker::Lorem.paragraph }
  published_at { Time.zone.now }
  notification_sent_at { Time.zone.now }
  effective_date { Faker::Date.unique.forward }
end
