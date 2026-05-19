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
Fabricator(:account_conversation) do
  account
  conversation
  status_ids { [Fabricate(:status).id] }
end
