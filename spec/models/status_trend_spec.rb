# frozen_string_literal: true

# == Schema Information
#
# Table name: status_trends
#
#  id         :bigint           not null, primary key
#  allowed    :boolean          default(FALSE), not null
#  language   :string
#  rank       :integer          default(0), not null
#  score      :float            default(0.0), not null
#  account_id :bigint           not null
#  status_id  :bigint           not null
#
# Indexes
#
#  index_status_trends_on_account_id  (account_id)
#  index_status_trends_on_status_id   (status_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (status_id => statuses.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe StatusTrend do
  it_behaves_like 'RankedTrend'

  describe 'Associations' do
    it { is_expected.to belong_to(:account).required }
    it { is_expected.to belong_to(:status).required }
  end

  describe 'Scopes' do
    describe '.allowed' do
      context 'with multiple trends per account' do
        let(:account) { Fabricate :account }
        let!(:allowed_high_score) { Fabricate :status_trend, allowed: true, score: 10, account: }

        before do
          Fabricate :status_trend, allowed: false, score: 25
          Fabricate :status_trend, allowed: true, score: 2, account:
        end

        it 'returns allowed records with account grouped max scores' do
          expect(described_class.allowed)
            .to contain_exactly(eq(allowed_high_score).and(have_attributes(score: 10)))
        end
      end
    end
  end
end
