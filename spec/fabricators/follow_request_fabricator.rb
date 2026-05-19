# frozen_string_literal: true

# == Schema Information
#
# Table name: follow_requests
#
#  id                :bigint           not null, primary key
#  languages         :string           is an Array
#  notify            :boolean          default(FALSE), not null
#  show_reblogs      :boolean          default(TRUE), not null
#  uri               :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint           not null
#  target_account_id :bigint           not null
#
# Indexes
#
#  index_follow_requests_on_account_id_and_target_account_id  (account_id,target_account_id) UNIQUE
#
# Foreign Keys
#
#  fk_76d644b0e7  (account_id => accounts.id) ON DELETE => cascade
#  fk_9291ec025d  (target_account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:follow_request) do
  account { Fabricate.build(:account) }
  target_account { Fabricate.build(:account, locked: true) }
end
