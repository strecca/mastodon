# frozen_string_literal: true

# == Schema Information
#
# Table name: account_warnings
#
#  id                :bigint           not null, primary key
#  action            :integer          default("none"), not null
#  overruled_at      :datetime
#  status_ids        :string           is an Array
#  text              :text             default(""), not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint
#  report_id         :bigint
#  target_account_id :bigint
#
# Indexes
#
#  index_account_warnings_on_account_id         (account_id)
#  index_account_warnings_on_target_account_id  (target_account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => nullify
#  fk_rails_...  (report_id => reports.id) ON DELETE => cascade
#  fk_rails_...  (target_account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:account_warning) do
  account { Fabricate.build(:account) }
  target_account(fabricator: :account)
  text { Faker::Lorem.paragraph }
  action 'suspend'
end
