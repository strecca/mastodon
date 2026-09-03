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

  # Two calls happen per #generate (Italian, then the English translation).
  # Pass the JSON text each successive call should return, in order; if
  # there are more calls than values given, the last one repeats (matches
  # RSpec's #and_return) -- handy for simulating "fails every time".
  def stub_claude_responses(*texts)
    responses = texts.map do |text|
      content_block = instance_double(Anthropic::Models::TextBlock, text: { text: text }.to_json)
      instance_double(Anthropic::Models::Message, content: [content_block])
    end
    messages = instance_double(Anthropic::Resources::Messages)
    allow(messages).to receive(:create).and_return(*responses)
    client = instance_double(Anthropic::Client, messages: messages)
    allow(Anthropic::Client).to receive(:new).and_return(client)
    messages
  end

  let(:full_it) { 'Un caldo benvenuto a tutti i membri della comunità. ' * 15 }
  let(:full_en) { 'A warm welcome to all members of the community. ' * 15 }
  let(:too_short) { 'Troppo corto.' }
  let(:still_italian) { "#{full_en}E poi c'è Seborga, con la sua Sagra del Polpo e Patate, tra i borghi più suggestivi della zona." }

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

      it 'saves the digest when both calls succeed on the first attempt' do
        messages = stub_claude_responses(full_it, full_en)

        digest = subject.generate

        expect(digest.content_it).to eq(full_it.strip)
        expect(digest.content_en).to eq(full_en.strip)
        expect(messages).to have_received(:create).twice
      end

      it 'raises Error and does not save when the Italian response is not valid JSON' do
        stub_claude_responses('not json')

        expect { subject.generate }.to raise_error(described_class::Error)
        expect(CommunityDailyDigest.find_by(digest_date: Date.today)).to be_nil
      end

      it 'raises Error when the Italian article is suspiciously short (truncated response)' do
        stub_claude_responses(too_short)

        expect { subject.generate }.to raise_error(described_class::Error, /Italian article too short/)
      end

      it 'raises Error when the English translation is suspiciously short (truncated response)' do
        stub_claude_responses(full_it, 'Too short.')

        expect { subject.generate }.to raise_error(described_class::Error, /English article too short/)
      end

      it 'raises Error when the "translation" still contains Italian text' do
        stub_claude_responses(full_it, still_italian)

        expect { subject.generate }.to raise_error(described_class::Error, /contains Italian text/)
      end

      it 'raises Error when the translation clears the absolute floor but is truncated relative to its source' do
        # Reproduces the live 2026-09-03 finding: a 555-char translation of a
        # 2428-char Italian source passed the flat 500-char floor while
        # actually being cut off mid-sentence.
        long_it = full_it * 5
        short_but_over_floor_en = 'A' * 550

        stub_claude_responses(long_it, short_but_over_floor_en)

        expect { subject.generate }.to raise_error(described_class::Error, /too short relative to its source/)
      end

      it 'does not save a digest row when validation rejects a response' do
        stub_claude_responses(too_short)

        expect { subject.generate }.to raise_error(described_class::Error)
        expect(CommunityDailyDigest.find_by(digest_date: Date.today)).to be_nil
      end

      it 'retries the Italian call and succeeds when a later attempt is well-formed' do
        messages = stub_claude_responses(too_short, full_it, full_en)

        digest = subject.generate

        expect(digest.content_it).to eq(full_it.strip)
        expect(digest.content_en).to eq(full_en.strip)
        expect(messages).to have_received(:create).exactly(3).times
      end

      it 'retries the translation call independently and succeeds when a later attempt is well-formed' do
        messages = stub_claude_responses(full_it, still_italian, full_en)

        digest = subject.generate

        expect(digest.content_en).to eq(full_en.strip)
        expect(messages).to have_received(:create).exactly(3).times
      end

      it 'gives up after MAX_ATTEMPTS persistent failures and still raises Error' do
        messages = stub_claude_responses(too_short)

        expect { subject.generate }.to raise_error(described_class::Error, /Italian article too short/)
        expect(messages).to have_received(:create).exactly(described_class::MAX_ATTEMPTS).times
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

      it 'raises Error and never calls the Anthropic client' do
        expect(Anthropic::Client).not_to receive(:new)

        expect { subject.generate }.to raise_error(described_class::Error, /ANTHROPIC_API_KEY/)
      end
    end
  end
end
