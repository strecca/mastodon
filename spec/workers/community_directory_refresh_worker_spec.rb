# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CommunityDirectoryRefreshWorker do
  include Redisable

  let(:channel) { 'community:listings' }

  before do
    redis.del("community_refresh_pending:#{channel}", 'community_refresh_pending:community:events')
    described_class.clear
  end

  describe '.schedule' do
    it 'queues one delayed job however many writes happen in a burst' do
      3.times { described_class.schedule(channel) }

      expect(described_class.jobs.size).to eq 1
      expect(described_class.jobs.first['args']).to eq [channel]
    end

    it 'queues separate jobs for separate channels' do
      described_class.schedule(channel)
      described_class.schedule('community:events')

      expect(described_class.jobs.pluck('args')).to contain_exactly([channel], ['community:events'])
    end
  end

  describe '#perform' do
    it 'publishes a refresh event on the category channel' do
      worker = described_class.new
      fake_redis = instance_double(Redis, del: 1, publish: 1)
      allow(worker).to receive(:redis).and_return(fake_redis)

      worker.perform(channel)

      expect(fake_redis).to have_received(:publish).with("timeline:#{channel}", { event: 'refresh' }.to_json)
    end

    it 'releases the lock so the next write can schedule again' do
      described_class.schedule(channel)
      described_class.new.perform(channel)
      described_class.clear

      described_class.schedule(channel)

      expect(described_class.jobs.size).to eq 1
    end
  end
end
