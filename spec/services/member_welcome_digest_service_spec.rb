# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MemberWelcomeDigestService do
  subject { described_class.new(account) }

  let(:account) { Fabricate(:account) }
  let(:since)   { 1.day.ago }

  around do |example|
    old_key = ENV.fetch('ANTHROPIC_API_KEY', nil)
    ENV['ANTHROPIC_API_KEY'] = 'test-key'
    example.run
    ENV['ANTHROPIC_API_KEY'] = old_key
  end

  def stub_claude_response(json)
    content_block = instance_double(Anthropic::Models::TextBlock, text: json)
    response      = instance_double(Anthropic::Models::Message, content: [content_block])
    messages      = instance_double(Anthropic::Resources::Messages, create: response)
    client        = instance_double(Anthropic::Client, messages: messages)
    allow(Anthropic::Client).to receive(:new).and_return(client)
    client
  end

  describe '#generate' do
    context 'when there is no activity of any kind since the given time' do
      it 'returns nil without calling Claude' do
        expect(Anthropic::Client).not_to receive(:new)

        expect(subject.generate(since: since)).to be_nil
      end
    end

    context 'when there is a followed post since the given time' do
      let(:followed) { Fabricate(:account) }

      before do
        account.follow!(followed)
        Fabricate(:status, account: followed, text: 'Hello from Imperia', created_at: 1.hour.ago)
      end

      it 'calls Claude and returns the summary when has_update is true' do
        stub_claude_response({ has_update: true, summary: 'Your friend posted something new.' }.to_json)

        expect(subject.generate(since: since)).to eq('Your friend posted something new.')
      end

      it 'returns nil when Claude reports has_update: false' do
        stub_claude_response({ has_update: false, summary: '' }.to_json)

        expect(subject.generate(since: since)).to be_nil
      end

      it 'raises Error on a malformed response' do
        stub_claude_response('not json')

        expect { subject.generate(since: since) }.to raise_error(described_class::Error)
      end
    end

    context 'when ANTHROPIC_API_KEY is not configured' do
      let(:followed) { Fabricate(:account) }

      before do
        account.follow!(followed)
        Fabricate(:status, account: followed, text: 'Hello', created_at: 1.hour.ago)
        ENV['ANTHROPIC_API_KEY'] = nil
      end

      it 'raises Error' do
        expect { subject.generate(since: since) }.to raise_error(described_class::Error, /ANTHROPIC_API_KEY/)
      end
    end
  end
end
