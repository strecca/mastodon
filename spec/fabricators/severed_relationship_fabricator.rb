# frozen_string_literal: true

# == Schema Information
#
# Table name: severed_relationships
#
#  id                              :bigint           not null, primary key
#  direction                       :integer          not null
#  languages                       :string           is an Array
#  notify                          :boolean
#  show_reblogs                    :boolean
#  created_at                      :datetime         not null
#  updated_at                      :datetime         not null
#  local_account_id                :bigint           not null
#  relationship_severance_event_id :bigint           not null
#  remote_account_id               :bigint           not null
#
# Indexes
#
#  index_severed_relationships_on_local_account_and_event  (local_account_id,relationship_severance_event_id)
#  index_severed_relationships_on_remote_account_id        (remote_account_id)
#  index_severed_relationships_on_unique_tuples            (relationship_severance_event_id,local_account_id,direction,remote_account_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (local_account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (relationship_severance_event_id => relationship_severance_events.id) ON DELETE => cascade
#  fk_rails_...  (remote_account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:severed_relationship) do
  local_account { Fabricate.build(:account) }
  remote_account { Fabricate.build(:account) }
  relationship_severance_event { Fabricate.build(:relationship_severance_event) }
  direction { :active }
end
