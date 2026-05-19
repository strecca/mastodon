# frozen_string_literal: true

# == Schema Information
#
# Table name: list_accounts
#
#  id                :bigint           not null, primary key
#  account_id        :bigint           not null
#  follow_id         :bigint
#  follow_request_id :bigint
#  list_id           :bigint           not null
#
# Indexes
#
#  index_list_accounts_on_account_id_and_list_id  (account_id,list_id) UNIQUE
#  index_list_accounts_on_follow_id               (follow_id) WHERE (follow_id IS NOT NULL)
#  index_list_accounts_on_follow_request_id       (follow_request_id) WHERE (follow_request_id IS NOT NULL)
#  index_list_accounts_on_list_id_and_account_id  (list_id,account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (follow_id => follows.id) ON DELETE => cascade
#  fk_rails_...  (follow_request_id => follow_requests.id) ON DELETE => cascade
#  fk_rails_...  (list_id => lists.id) ON DELETE => cascade
#
Fabricator(:list_account) do
  list

  initialize_with do
    resolved_class.new(list: list, account: list.account)
  end
end
