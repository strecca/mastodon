# frozen_string_literal: true

# == Schema Information
#
# Table name: account_conversations
#
#  id                      :bigint           not null, primary key
#  lock_version            :integer          default(0), not null
#  participant_account_ids :bigint           default([]), not null, is an Array
#  status_ids              :bigint           default([]), not null, is an Array
#  unread                  :boolean          default(FALSE), not null
#  account_id              :bigint           not null
#  conversation_id         :bigint           not null
#  last_status_id          :bigint
#
# Indexes
#
#  index_account_conversations_on_conversation_id  (conversation_id)
#  index_unique_conversations                      (account_id,conversation_id,participant_account_ids) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (conversation_id => conversations.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe AccountConversation do
  let!(:alice) { Fabricate(:account, username: 'alice') }
  let!(:bob)   { Fabricate(:account, username: 'bob') }
  let!(:mark)  { Fabricate(:account, username: 'mark') }

  describe '.add_status' do
    it 'creates new record when no others exist' do
      status = Fabricate(:status, account: alice, visibility: :direct)
      status.mentions.create(account: bob)

      conversation = described_class.add_status(alice, status)

      expect(conversation.participant_accounts).to include(bob)
      expect(conversation.last_status).to eq status
      expect(conversation.status_ids).to eq [status.id]
    end

    it 'appends to old record when there is a match' do
      last_status  = Fabricate(:status, account: alice, visibility: :direct)
      conversation = described_class.create!(account: alice, conversation_id: last_status.conversation_id, participant_account_ids: [bob.id], status_ids: [last_status.id])

      status = Fabricate(:status, account: bob, visibility: :direct, thread: last_status)
      status.mentions.create(account: alice)

      new_conversation = described_class.add_status(alice, status)

      expect(new_conversation.id).to eq conversation.id
      expect(new_conversation.participant_accounts).to include(bob)
      expect(new_conversation.last_status).to eq status
      expect(new_conversation.status_ids).to eq [last_status.id, status.id]
    end

    it 'creates new record when new participants are added' do
      last_status  = Fabricate(:status, account: alice, visibility: :direct)
      conversation = described_class.create!(account: alice, conversation_id: last_status.conversation_id, participant_account_ids: [bob.id], status_ids: [last_status.id])

      status = Fabricate(:status, account: bob, visibility: :direct, thread: last_status)
      status.mentions.create(account: alice)
      status.mentions.create(account: mark)

      new_conversation = described_class.add_status(alice, status)

      expect(new_conversation.id).to_not eq conversation.id
      expect(new_conversation.participant_accounts).to include(bob, mark)
      expect(new_conversation.last_status).to eq status
      expect(new_conversation.status_ids).to eq [status.id]
    end
  end

  describe '.remove_status' do
    it 'updates last status to a previous value' do
      last_status  = Fabricate(:status, account: alice, visibility: :direct)
      status       = Fabricate(:status, account: alice, visibility: :direct)
      conversation = described_class.create!(account: alice, conversation_id: last_status.conversation_id, participant_account_ids: [bob.id], status_ids: [status.id, last_status.id])
      last_status.mentions.create(account: bob)
      last_status.destroy!
      conversation.reload
      expect(conversation.last_status).to eq status
      expect(conversation.status_ids).to eq [status.id]
    end

    it 'removes the record if no other statuses are referenced' do
      last_status  = Fabricate(:status, account: alice, visibility: :direct)
      conversation = described_class.create!(account: alice, conversation_id: last_status.conversation_id, participant_account_ids: [bob.id], status_ids: [last_status.id])
      last_status.mentions.create(account: bob)
      last_status.destroy!
      expect(described_class.where(id: conversation.id).count).to eq 0
    end
  end
end
