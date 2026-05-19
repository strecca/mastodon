# frozen_string_literal: true

# == Schema Information
#
# Table name: collection_items
#
#  id                        :bigint           not null, primary key
#  activity_uri              :string
#  approval_last_verified_at :datetime
#  approval_uri              :string
#  object_uri                :string
#  position                  :integer          default(1), not null
#  state                     :integer          default("pending"), not null
#  uri                       :string
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  account_id                :bigint
#  collection_id             :bigint           not null
#
# Indexes
#
#  index_collection_items_on_account_id_and_collection_id  (account_id,collection_id) UNIQUE
#  index_collection_items_on_approval_uri                  (approval_uri) UNIQUE WHERE (approval_uri IS NOT NULL)
#  index_collection_items_on_collection_id                 (collection_id)
#  index_collection_items_on_uri                           (uri) UNIQUE WHERE (uri IS NOT NULL)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#  fk_rails_...  (collection_id => collections.id) ON DELETE => cascade
#
Fabricator(:collection_item) do
  collection                { Fabricate.build(:collection) }
  account                   { Fabricate.build(:account) }
  position                  { sequence(:position, 1) }
  state                     :accepted
end

Fabricator(:unverified_remote_collection_item, from: :collection_item) do
  account      nil
  state        :pending
  object_uri   { Fabricate.build(:remote_account).uri }
  uri { sequence(:uri) { |i| "https://example.com/collection_items/#{i}" } }
end
