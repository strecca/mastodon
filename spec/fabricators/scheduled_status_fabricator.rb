# frozen_string_literal: true

# == Schema Information
#
# Table name: scheduled_statuses
#
#  id           :bigint           not null, primary key
#  params       :jsonb
#  scheduled_at :datetime
#  account_id   :bigint           not null
#
# Indexes
#
#  index_scheduled_statuses_on_account_id    (account_id)
#  index_scheduled_statuses_on_scheduled_at  (scheduled_at)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:scheduled_status) do
  account { Fabricate.build(:account) }
  scheduled_at { 20.hours.from_now }
  params { {} }
end
