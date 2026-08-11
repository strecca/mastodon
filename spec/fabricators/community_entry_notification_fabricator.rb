# frozen_string_literal: true

Fabricator(:community_entry_notification) do
  recipient { Fabricate(:account) }
  sender { Fabricate(:account) }
  notifiable { Fabricate(:community_listing) }
  category_key 'listings'
  kind :new_entry
end
