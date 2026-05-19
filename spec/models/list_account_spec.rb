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
require 'rails_helper'

RSpec.describe ListAccount do
  describe 'Callbacks to set follows' do
    context 'when list owner follows account' do
      let!(:follow) { Fabricate :follow }
      let(:list) { Fabricate :list, account: follow.account }

      it 'finds and sets the follow with the list account' do
        list_account = Fabricate :list_account, list: list, account: follow.target_account
        expect(list_account)
          .to have_attributes(
            follow: eq(follow),
            follow_request: be_nil
          )
      end
    end

    context 'when list owner has a follow request for account' do
      let!(:follow_request) { Fabricate :follow_request }
      let(:list) { Fabricate :list, account: follow_request.account }

      it 'finds and sets the follow request with the list account' do
        list_account = Fabricate :list_account, list: list, account: follow_request.target_account
        expect(list_account)
          .to have_attributes(
            follow: be_nil,
            follow_request: eq(follow_request)
          )
      end
    end

    context 'when list owner is the account' do
      it 'does not set follow or follow request' do
        list_account = Fabricate :list_account
        expect(list_account)
          .to have_attributes(
            follow: be_nil,
            follow_request: be_nil
          )
      end
    end
  end
end
