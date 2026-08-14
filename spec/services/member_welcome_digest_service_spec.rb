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
    messages
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

      it 'includes a working internal status URL in the prompt sent to Claude' do
        messages = stub_claude_response({ has_update: true, summary: 'x' }.to_json)
        status = Status.where(account: followed).first

        subject.generate(since: since)

        expect(messages).to have_received(:create) do |**kwargs|
          prompt = kwargs[:messages].first[:content]
          expect(prompt).to include("/@#{followed.acct}/#{status.id}")
        end
      end
    end

    context 'when there is a community directory notification since the given time' do
      let(:sender) { Fabricate(:account) }
      let(:listing) { Fabricate(:community_listing, account: sender) }

      before do
        Fabricate(:community_entry_notification, recipient: account, sender: sender,
                                                   notifiable: listing, category_key: 'listings', kind: :new_entry)
      end

      it 'includes the specific category name and a real entry URL, never a vague placeholder' do
        messages = stub_claude_response({ has_update: true, summary: 'x' }.to_json)

        subject.generate(since: since)

        expect(messages).to have_received(:create) do |**kwargs|
          prompt = kwargs[:messages].first[:content]
          expect(prompt).to include("/community_listings/#{listing.id}")
          expect(prompt).to include(CommunityDirectoryConfig.display_name_for('listings'))
        end
      end

      it 'instructs Claude in the system prompt to be specific and to use markdown links' do
        stub_claude_response({ has_update: true, summary: 'x' }.to_json)

        expect(described_class::SYSTEM_PROMPT).to include('never vague')
        expect(described_class::SYSTEM_PROMPT).to include('markdown link')
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
