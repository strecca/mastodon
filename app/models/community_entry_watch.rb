# frozen_string_literal: true

# == Schema Information
#
# Table name: community_entry_watches
#
#  id              :bigint           not null, primary key
#  watchable_type  :string           not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  account_id      :bigint           not null
#  watchable_id    :bigint           not null
#
# Indexes
#
#  idx_community_entry_watches_unique  (account_id,watchable_type,watchable_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#
class CommunityEntryWatch < ApplicationRecord
  belongs_to :account
  belongs_to :watchable, polymorphic: true

  validates :account_id, uniqueness: { scope: %i[watchable_type watchable_id] }
end
