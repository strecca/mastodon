# frozen_string_literal: true

# == Schema Information
#
# Table name: fasp_subscriptions
#
#  id                  :bigint           not null, primary key
#  category            :string           not null
#  max_batch_size      :integer          not null
#  subscription_type   :string           not null
#  threshold_likes     :integer
#  threshold_replies   :integer
#  threshold_shares    :integer
#  threshold_timeframe :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  fasp_provider_id    :bigint           not null
#
# Indexes
#
#  index_fasp_subscriptions_on_fasp_provider_id  (fasp_provider_id)
#
# Foreign Keys
#
#  fk_rails_...  (fasp_provider_id => fasp_providers.id)
#
require 'rails_helper'

RSpec.describe Fasp::Subscription do
  describe '#threshold=' do
    subject { described_class.new }

    it 'allows setting all threshold values at once' do
      subject.threshold = {
        'timeframe' => 30,
        'shares' => 5,
        'likes' => 8,
        'replies' => 7,
      }

      expect(subject.threshold_timeframe).to eq 30
      expect(subject.threshold_shares).to eq 5
      expect(subject.threshold_likes).to eq 8
      expect(subject.threshold_replies).to eq 7
    end
  end

  describe '#timeframe_start' do
    subject { described_class.new(threshold_timeframe: 45) }

    it 'returns a Time representing the beginning of the timeframe' do
      travel_to Time.zone.local(2025, 4, 7, 16, 40) do
        expect(subject.timeframe_start).to eq Time.zone.local(2025, 4, 7, 15, 55)
      end
    end
  end
end
