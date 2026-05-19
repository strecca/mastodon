# frozen_string_literal: true

#
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
class AccountRelationshipSeveranceEvent < ApplicationRecord
  self.ignored_columns += %w(
    relationships_count
  )

  belongs_to :account
  belongs_to :relationship_severance_event

  has_many :severed_relationships, through: :relationship_severance_event

  delegate :type,
           :target_name,
           :purged,
           :purged?,
           to: :relationship_severance_event,
           prefix: false

  before_create :set_relationships_count!

  def identifier
    "#{target_name}-#{created_at.to_date.iso8601}"
  end

  private

  def set_relationships_count!
    self.followers_count = severed_relationships.about_local_account(account).passive.count
    self.following_count = severed_relationships.about_local_account(account).active.count
  end
end
