# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CommunityLiveRefresh do
  before { allow(CommunityDirectoryRefreshWorker).to receive(:schedule) }

  describe 'a listing' do
    it 'signals a refresh when created, edited and deleted' do
      calls = []
      allow(CommunityDirectoryRefreshWorker).to receive(:schedule) { |channel| calls << channel }

      listing = Fabricate(:community_listing)
      expect(calls).to include('community:listings')

      calls.clear
      listing.update!(title: 'Changed title')
      expect(calls).to eq ['community:listings']

      calls.clear
      listing.destroy!
      expect(calls).to eq ['community:listings']
    end
  end

  describe 'a quick share' do
    it 'signals a refresh on its own channel' do
      Fabricate(:community_quick_share)

      expect(CommunityDirectoryRefreshWorker).to have_received(:schedule).with('community:quick_shares').at_least(:once)
    end
  end

  describe 'every list-based category' do
    it 'is wired to its own channel through CommunitySearchable' do
      %w(CommunityArtist CommunityService CommunityRestaurant CommunityProperty CommunityEvent).each do |name|
        klass = name.constantize
        expect(klass.ancestors).to include(described_class), "#{name} does not include CommunityLiveRefresh"
        expect(klass._commit_callbacks.map(&:kind)).to include(:after), "#{name} has no after_commit refresh"
      end
    end
  end
end
