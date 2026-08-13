# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MemberWelcomeDigestWorker do
  subject { described_class.new }

  let(:account) { Fabricate(:account) }
  let(:since)   { 1.day.ago }

  describe '#perform' do
    it 'persists the digest content returned by the service and finishes the async refresh' do
      service = instance_double(MemberWelcomeDigestService, generate: 'Welcome back!')
      allow(MemberWelcomeDigestService).to receive(:new).with(account).and_return(service)

      async_refresh = instance_double(AsyncRefresh, finish!: true)
      allow(AsyncRefresh).to receive(:new).and_return(async_refresh)

      subject.perform(account.id, since.iso8601)

      digest = MemberWelcomeDigest.find_by(account: account, digest_date: Date.current)
      expect(digest.content).to eq('Welcome back!')
      expect(async_refresh).to have_received(:finish!)
    end

    it 'persists a nil-content row when there is nothing to report' do
      service = instance_double(MemberWelcomeDigestService, generate: nil)
      allow(MemberWelcomeDigestService).to receive(:new).and_return(service)

      subject.perform(account.id, since.iso8601)

      digest = MemberWelcomeDigest.find_by(account: account, digest_date: Date.current)
      expect(digest.content).to be_nil
    end

    it 'does not call the service again if a digest already exists for today' do
      Fabricate(:member_welcome_digest, account: account, digest_date: Date.current)

      expect(MemberWelcomeDigestService).not_to receive(:new)

      subject.perform(account.id, since.iso8601)
    end

    it 'persists a nil-content row and does not raise when the service fails' do
      service = instance_double(MemberWelcomeDigestService)
      allow(MemberWelcomeDigestService).to receive(:new).and_return(service)
      allow(service).to receive(:generate).and_raise(MemberWelcomeDigestService::Error, 'boom')

      expect { subject.perform(account.id, since.iso8601) }.not_to raise_error

      digest = MemberWelcomeDigest.find_by(account: account, digest_date: Date.current)
      expect(digest.content).to be_nil
    end

    it 'does not raise when the account no longer exists' do
      expect { subject.perform(-1, since.iso8601) }.not_to raise_error
    end
  end
end
