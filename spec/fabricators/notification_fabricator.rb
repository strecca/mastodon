# frozen_string_literal: true

# == Schema Information
#
# Table name: notifications
#
#  id              :bigint           not null, primary key
#  activity_type   :string           not null
#  filtered        :boolean          default(FALSE), not null
#  group_key       :string
#  type            :string
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  account_id      :bigint           not null
#  activity_id     :bigint           not null
#  from_account_id :bigint           not null
#
# Indexes
#
#  index_notifications_on_account_id_and_group_key       (account_id,group_key) WHERE (group_key IS NOT NULL)
#  index_notifications_on_account_id_and_id_and_type     (account_id,id DESC,type)
#  index_notifications_on_activity_id_and_activity_type  (activity_id,activity_type)
#  index_notifications_on_filtered                       (account_id,id DESC,type) WHERE (filtered = false)
#  index_notifications_on_from_account_id                (from_account_id)
#
# Foreign Keys
#
#  fk_c141c8ee55  (account_id => accounts.id) ON DELETE => cascade
#  fk_fbd6b0bf9e  (from_account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:notification) do
  activity fabricator: :status
  account { Fabricate.build(:account) }
end
