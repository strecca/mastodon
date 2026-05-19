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
class SeveredRelationship < ApplicationRecord
  belongs_to :relationship_severance_event
  belongs_to :local_account, class_name: 'Account'
  belongs_to :remote_account, class_name: 'Account'

  enum :direction, {
    passive: 0, # analogous to `local_account.passive_relationships`
    active: 1, # analogous to `local_account.active_relationships`
  }

  scope :about_local_account, ->(account) { where(local_account: account) }
  scope :about_remote_account, ->(account) { where(remote_account: account) }

  scope :active, -> { where(direction: :active) }
  scope :passive, -> { where(direction: :passive) }

  def account
    active? ? local_account : remote_account
  end

  def target_account
    active? ? remote_account : local_account
  end
end
