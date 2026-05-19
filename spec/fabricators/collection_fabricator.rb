# frozen_string_literal: true

# == Schema Information
#
# Table name: collections
#
#  id                       :bigint           not null, primary key
#  description              :text
#  description_html         :text
#  discoverable             :boolean          not null
#  item_count               :integer          default(0), not null
#  language                 :string
#  local                    :boolean          not null
#  name                     :string           not null
#  original_number_of_items :integer
#  sensitive                :boolean          not null
#  uri                      :string
#  url                      :string
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#  account_id               :bigint           not null
#  tag_id                   :bigint
#
# Indexes
#
#  index_collections_on_account_id  (account_id)
#  index_collections_on_tag_id      (tag_id)
#  index_collections_on_uri         (uri) UNIQUE WHERE (uri IS NOT NULL)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#  fk_rails_...  (tag_id => tags.id)
#
Fabricator(:collection) do
  account      { Fabricate.build(:account) }
  name         { sequence(:name) { |i| "Collection ##{i}" } }
  description  'People to follow'
  local        true
  sensitive    false
  discoverable true
end

Fabricator(:remote_collection, from: :collection) do
  account { Fabricate.build(:remote_account) }
  local false
  description nil
  description_html '<p>People to follow</p>'
  uri { sequence(:uri) { |i| "https://example.com/collections/#{i}" } }
  original_number_of_items 0
end
