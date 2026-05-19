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
require 'rails_helper'

RSpec.describe SeveredRelationship do
  let(:local_account)  { Fabricate(:account) }
  let(:remote_account) { Fabricate(:account, domain: 'example.com') }
  let(:event)          { Fabricate(:relationship_severance_event) }

  describe '#account' do
    context 'when the local account is the follower' do
      let(:severed_relationship) { Fabricate(:severed_relationship, relationship_severance_event: event, local_account: local_account, remote_account: remote_account, direction: :active) }

      it 'returns the local account' do
        expect(severed_relationship.account).to eq local_account
      end
    end

    context 'when the local account is being followed' do
      let(:severed_relationship) { Fabricate(:severed_relationship, relationship_severance_event: event, local_account: local_account, remote_account: remote_account, direction: :passive) }

      it 'returns the remote account' do
        expect(severed_relationship.account).to eq remote_account
      end
    end
  end

  describe '#target_account' do
    context 'when the local account is the follower' do
      let(:severed_relationship) { Fabricate(:severed_relationship, relationship_severance_event: event, local_account: local_account, remote_account: remote_account, direction: :active) }

      it 'returns the remote account' do
        expect(severed_relationship.target_account).to eq remote_account
      end
    end

    context 'when the local account is being followed' do
      let(:severed_relationship) { Fabricate(:severed_relationship, relationship_severance_event: event, local_account: local_account, remote_account: remote_account, direction: :passive) }

      it 'returns the local account' do
        expect(severed_relationship.target_account).to eq local_account
      end
    end
  end
end
