# frozen_string_literal: true

# == Schema Information
#
# Table name: conversation_mutes
#
#  id              :bigint           not null, primary key
#  account_id      :bigint           not null
#  conversation_id :bigint           not null
#
# Indexes
#
#  index_conversation_mutes_on_account_id_and_conversation_id  (account_id,conversation_id) UNIQUE
#
# Foreign Keys
#
#  fk_225b4212bb  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...   (conversation_id => conversations.id) ON DELETE => cascade
#

class ConversationMute < ApplicationRecord
  belongs_to :account
  belongs_to :conversation
end
