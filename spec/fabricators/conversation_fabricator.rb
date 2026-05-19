# frozen_string_literal: true

# == Schema Information
#
# Table name: conversations
#
#  id                :bigint           not null, primary key
#  uri               :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  parent_account_id :bigint
#  parent_status_id  :bigint
#
# Indexes
#
#  index_conversations_on_parent_status_id  (parent_status_id) UNIQUE WHERE (parent_status_id IS NOT NULL)
#  index_conversations_on_uri               (uri) UNIQUE WHERE (uri IS NOT NULL)
#
Fabricator(:conversation) do
  parent_account { Fabricate(:account) }
end
