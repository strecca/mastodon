# frozen_string_literal: true

# == Schema Information
#
# Table name: polls
#
#  id              :bigint           not null, primary key
#  cached_tallies  :bigint           default([]), not null, is an Array
#  expires_at      :datetime
#  hide_totals     :boolean          default(FALSE), not null
#  last_fetched_at :datetime
#  lock_version    :integer          default(0), not null
#  multiple        :boolean          default(FALSE), not null
#  options         :string           default([]), not null, is an Array
#  voters_count    :bigint
#  votes_count     :bigint           default(0), not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  account_id      :bigint           not null
#  status_id       :bigint           not null
#
# Indexes
#
#  index_polls_on_account_id  (account_id)
#  index_polls_on_status_id   (status_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (status_id => statuses.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe Poll do
  it_behaves_like 'Expireable'

  describe '#reset_votes!' do
    let(:poll) { Fabricate :poll, cached_tallies: [2, 3], votes_count: 5, voters_count: 5 }
    let!(:vote) { Fabricate :poll_vote, poll: }

    it 'resets vote data and deletes votes' do
      expect { poll.reset_votes! }
        .to change(poll, :cached_tallies).to([0, 0])
        .and change(poll, :votes_count).to(0)
        .and(change(poll, :voters_count).to(0))
      expect { vote.reload }
        .to raise_error(ActiveRecord::RecordNotFound)
    end
  end

  describe 'Validations' do
    subject { Fabricate.build(:poll) }

    it { is_expected.to validate_presence_of(:expires_at) }
  end
end
