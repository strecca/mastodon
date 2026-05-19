# frozen_string_literal: true

# == Schema Information
#
# Table name: tag_follows
#
#  id         :bigint           not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#  tag_id     :bigint           not null
#
# Indexes
#
#  index_tag_follows_on_account_id_and_tag_id  (account_id,tag_id) UNIQUE
#  index_tag_follows_on_tag_id                 (tag_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (tag_id => tags.id) ON DELETE => cascade
#
Fabricator(:tag_follow) do
  tag
  account { Fabricate.build(:account) }
end
