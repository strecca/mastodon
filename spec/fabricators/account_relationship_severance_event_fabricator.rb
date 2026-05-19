# frozen_string_literal: true

# == Schema Information
#
# Table name: account_relationship_severance_events
#
#  id                              :bigint           not null, primary key
#  followers_count                 :integer          default(0), not null
#  following_count                 :integer          default(0), not null
#  created_at                      :datetime         not null
#  updated_at                      :datetime         not null
#  account_id                      :bigint           not null
#  relationship_severance_event_id :bigint           not null
#
# Indexes
#
#  idx_on_account_id_relationship_severance_event_id_7bd82bf20e  (account_id,relationship_severance_event_id) UNIQUE
#  idx_on_relationship_severance_event_id_403f53e707             (relationship_severance_event_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (relationship_severance_event_id => relationship_severance_events.id) ON DELETE => cascade
#
Fabricator(:account_relationship_severance_event) do
  account
  relationship_severance_event
end
