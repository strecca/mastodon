# frozen_string_literal: true

# == Schema Information
#
# Table name: generated_annual_reports
#
#  id             :bigint           not null, primary key
#  data           :jsonb            not null
#  schema_version :integer          not null
#  share_key      :string
#  viewed_at      :datetime
#  year           :integer          not null
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  account_id     :bigint           not null
#
# Indexes
#
#  index_generated_annual_reports_on_account_id_and_year  (account_id,year) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#
Fabricator(:generated_annual_report) do
  account { Fabricate.build(:account) }
  data { { test: :data } }
  schema_version { AnnualReport::SCHEMA }
  year { sequence(:year) { |i| 2000 + i } }
end
