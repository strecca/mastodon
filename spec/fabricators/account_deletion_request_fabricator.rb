# frozen_string_literal: true

# == Schema Information
#
# Table name: account_deletion_requests
#
#  id         :bigint           not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#
# Indexes
#
#  index_account_deletion_requests_on_account_id  (account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:account_deletion_request) do
  account
end
