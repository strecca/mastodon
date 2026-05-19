# frozen_string_literal: true

# == Schema Information
#
# Table name: reports
#
#  id                         :bigint           not null, primary key
#  action_taken_at            :datetime
#  category                   :integer          default("other"), not null
#  comment                    :text             default(""), not null
#  forwarded                  :boolean
#  rule_ids                   :bigint           is an Array
#  status_ids                 :bigint           default([]), not null, is an Array
#  uri                        :string
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#  account_id                 :bigint           not null
#  action_taken_by_account_id :bigint
#  application_id             :bigint
#  assigned_account_id        :bigint
#  target_account_id          :bigint           not null
#
# Indexes
#
#  index_reports_on_account_id                  (account_id)
#  index_reports_on_action_taken_by_account_id  (action_taken_by_account_id) WHERE (action_taken_by_account_id IS NOT NULL)
#  index_reports_on_assigned_account_id         (assigned_account_id) WHERE (assigned_account_id IS NOT NULL)
#  index_reports_on_target_account_id           (target_account_id)
#
# Foreign Keys
#
#  fk_4b81f7522c  (account_id => accounts.id) ON DELETE => cascade
#  fk_bca45b75fd  (action_taken_by_account_id => accounts.id) ON DELETE => nullify
#  fk_eb37af34f0  (target_account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...   (application_id => oauth_applications.id) ON DELETE => nullify
#  fk_rails_...   (assigned_account_id => accounts.id) ON DELETE => nullify
#
Fabricator(:report) do
  account { Fabricate.build(:account) }
  target_account  { Fabricate.build(:account) }
  comment         'You nasty'
  action_taken_at nil
end
