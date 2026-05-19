# frozen_string_literal: true

# == Schema Information
#
# Table name: appeals
#
#  id                     :bigint           not null, primary key
#  approved_at            :datetime
#  rejected_at            :datetime
#  text                   :text             default(""), not null
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  account_id             :bigint           not null
#  account_warning_id     :bigint           not null
#  approved_by_account_id :bigint
#  rejected_by_account_id :bigint
#
# Indexes
#
#  index_appeals_on_account_id              (account_id)
#  index_appeals_on_account_warning_id      (account_warning_id) UNIQUE
#  index_appeals_on_approved_by_account_id  (approved_by_account_id) WHERE (approved_by_account_id IS NOT NULL)
#  index_appeals_on_rejected_by_account_id  (rejected_by_account_id) WHERE (rejected_by_account_id IS NOT NULL)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (account_warning_id => account_warnings.id) ON DELETE => cascade
#  fk_rails_...  (approved_by_account_id => accounts.id) ON DELETE => nullify
#  fk_rails_...  (rejected_by_account_id => accounts.id) ON DELETE => nullify
#
Fabricator(:appeal) do
  strike(fabricator: :account_warning)
  account { |attrs| attrs[:strike].target_account }
  text { Faker::Lorem.paragraph }
end
