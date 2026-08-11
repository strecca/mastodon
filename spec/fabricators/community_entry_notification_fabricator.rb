# frozen_string_literal: true

Fabricator(:community_entry_notification) do
  recipient_account { Fabricate(:account) }
  sender_account { Fabricate(:account) }
  notifiable { Fabricate(:community_listing) }
  category_key 'listings'
  kind :new_entry
end
