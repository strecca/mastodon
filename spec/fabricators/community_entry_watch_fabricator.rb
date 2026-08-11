# frozen_string_literal: true

Fabricator(:community_entry_watch) do
  account
  watchable { Fabricate(:community_listing) }
end
