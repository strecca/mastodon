# frozen_string_literal: true

require 'rails_helper'

RSpec.describe DailyDigestService do
  subject { described_class.new }

  around do |example|
    original = Rails.configuration.x.daily_digest.anthropic
    Rails.configuration.x.daily_digest.anthropic = { api_key: 'test-key', model: 'claude-test' }
    example.run
    Rails.configuration.x.daily_digest.anthropic = original
  end

  def stub_claude_response(json)
    content_block = instance_double(Anthropic::Models::TextBlock, text: json)
    response      = instance_double(Anthropic::Models::Message, content: [content_block])
    messages      = instance_double(Anthropic::Resources::Messages, create: response)
    client        = instance_double(Anthropic::Client, messages: messages)
    allow(Anthropic::Client).to receive(:new).and_return(client)
    messages
  end

  let(:full_it) { 'Un caldo benvenuto a tutti i membri della comunità. ' * 15 }
  let(:full_en) { 'A warm welcome to all members of the community. ' * 15 }

  describe '#generate' do
    context 'when there are no upcoming approved auto-imported events' do
      it 'returns nil without calling Claude' do
        expect(Anthropic::Client).not_to receive(:new)

        expect(subject.generate).to be_nil
      end
    end

    context 'when there is an upcoming approved auto-imported event' do
      before do
        CommunityEvent.create!(
          account: Fabricate(:account),
          status: :approved,
          auto_imported: true,
          category: ['community'],
          event_name: 'Sagra del Polpo',
          event_date: 3.days.from_now,
          location_town_city: 'Seborga',
          event_description: 'Festa di paese con musica e cibo locale.'
        )
      end

      it 'saves the digest when Claude returns a well-formed bilingual response' do
        stub_claude_response({ it: full_it, en: full_en }.to_json)

        digest = subject.generate

        expect(digest.content_it).to eq(full_it.strip)
        expect(digest.content_en).to eq(full_en.strip)
      end

      it 'raises Error and does not save when the response is not valid JSON' do
        stub_claude_response('not json')

        expect { subject.generate }.to raise_error(described_class::Error)
        expect(CommunityDailyDigest.find_by(digest_date: Date.today)).to be_nil
      end

      it 'raises Error when the Italian article is suspiciously short (truncated response)' do
        stub_claude_response({ it: 'Troppo corto.', en: full_en }.to_json)

        expect { subject.generate }.to raise_error(described_class::Error, /Italian article too short/)
      end

      it 'raises Error when the English article is suspiciously short (truncated response)' do
        stub_claude_response({ it: full_it, en: 'Too short.' }.to_json)

        expect { subject.generate }.to raise_error(described_class::Error, /English article too short/)
      end

      it 'raises Error when the English field still contains Italian text (truncated mid-translation)' do
        # Reproduces the live 2026-08-22 incident: MAX_TOKENS ran out mid-article,
        # the schema closed "it" early, and the model's unfinished Italian
        # continuation landed in "en" instead of an actual translation.
        leaked_italian = "#{full_en}E poi c'è Seborga, con la sua Sagra del Polpo e Patate, tra i borghi più suggestivi della zona."

        stub_claude_response({ it: full_it, en: leaked_italian }.to_json)

        expect { subject.generate }.to raise_error(described_class::Error, /contains Italian text/)
      end

      it 'does not save a digest row when validation rejects the response' do
        stub_claude_response({ it: 'Troppo corto.', en: full_en }.to_json)

        expect { subject.generate }.to raise_error(described_class::Error)
        expect(CommunityDailyDigest.find_by(digest_date: Date.today)).to be_nil
      end
    end

    context 'when ANTHROPIC_API_KEY is not configured' do
      before do
        CommunityEvent.create!(
          account: Fabricate(:account),
          status: :approved,
          auto_imported: true,
          category: ['community'],
          event_name: 'Sagra del Polpo',
          event_date: 3.days.from_now,
          location_town_city: 'Seborga',
          event_description: 'Festa di paese.'
        )
        Rails.configuration.x.daily_digest.anthropic = { api_key: nil, model: 'claude-test' }
      end

      it 'raises Error' do
        expect { subject.generate }.to raise_error(described_class::Error, /ANTHROPIC_API_KEY/)
      end
    end
  end
end
