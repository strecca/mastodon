# frozen_string_literal: true

# == Schema Information
#
# Table name: featured_tags
#
#  id             :bigint           not null, primary key
#  last_status_at :datetime
#  name           :string
#  statuses_count :bigint           default(0), not null
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  account_id     :bigint           not null
#  tag_id         :bigint           not null
#
# Indexes
#
#  index_featured_tags_on_account_id_and_tag_id  (account_id,tag_id) UNIQUE
#  index_featured_tags_on_tag_id                 (tag_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (tag_id => tags.id) ON DELETE => cascade
#
Fabricator(:featured_tag) do
  account { Fabricate.build(:account) }
  tag { nil }
  name { sequence(:name) { |i| "Tag#{i}" } }
end
