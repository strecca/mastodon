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
RSpec.describe AccountRelationshipSeveranceEvent do
  describe 'Associations' do
    it { is_expected.to belong_to(:account) }
    it { is_expected.to belong_to(:relationship_severance_event) }
    it { is_expected.to have_many(:severed_relationships).through(:relationship_severance_event) }
  end

  describe '#identifier' do
    subject { account_relationship_severance_event.identifier }

    let(:account_relationship_severance_event) { Fabricate.build :account_relationship_severance_event, relationship_severance_event:, created_at: DateTime.new(2026, 3, 15, 1, 2, 3) }
    let(:relationship_severance_event) { Fabricate.build :relationship_severance_event, target_name: 'host.example' }

    context 'with a hostname target and timestamp' do
      it { is_expected.to eq('host.example-2026-03-15') }
    end
  end
end
