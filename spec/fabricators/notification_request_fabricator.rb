# frozen_string_literal: true

# == Schema Information
#
# Table name: notification_requests
#
#  id                  :bigint           not null, primary key
#  notifications_count :bigint           default(0), not null
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  account_id          :bigint           not null
#  from_account_id     :bigint           not null
#  last_status_id      :bigint
#
# Indexes
#
#  index_notification_requests_on_account_id_and_from_account_id  (account_id,from_account_id) UNIQUE
#  index_notification_requests_on_from_account_id                 (from_account_id)
#  index_notification_requests_on_last_status_id                  (last_status_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (from_account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (last_status_id => statuses.id) ON DELETE => nullify
#
Fabricator(:notification_request) do
  account
  from_account { Fabricate.build(:account) }
  last_status { Fabricate.build(:status) }
end
