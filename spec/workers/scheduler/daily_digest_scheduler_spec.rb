# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Scheduler::DailyDigestScheduler do
  subject { described_class.new }

  describe '#perform' do
    it 'calls DailyDigestService#generate for today' do
      service = instance_double(DailyDigestService, generate: nil)
      allow(DailyDigestService).to receive(:new).and_return(service)

      subject.perform

      expect(service).to have_received(:generate).with(date: Date.today)
    end

    it 'lets a DailyDigestService::Error propagate instead of swallowing it' do
      service = instance_double(DailyDigestService)
      allow(DailyDigestService).to receive(:new).and_return(service)
      allow(service).to receive(:generate).and_raise(DailyDigestService::Error, 'API key is invalid.')

      # This must NOT be caught here — retry: 0 means Sidekiq sends it straight
      # to the dead set on this one failure, which is what triggers the
      # existing death-handler alert email (config/initializers/sidekiq_callbacks.rb).
      # Swallowing it here (as this worker used to) makes the job report
      # "done" to Sidekiq and the failure becomes invisible — see the
      # 2026-08-12/13 Anthropic key expiry incident, where two consecutive
      # days of silent failures produced no alert.
      expect { subject.perform }.to raise_error(DailyDigestService::Error, 'API key is invalid.')
    end
  end
end
