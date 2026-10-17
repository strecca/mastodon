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

      it 'raises Error when the "translation" still contains an untranslated Italian sentence (no paragraph break)' do
        stub_claude_responses(full_it, still_italian)

        expect { subject.generate }.to raise_error(described_class::Error, /contains an Italian sentence/)
      end

      it 'raises Error when an untranslated Italian paragraph is appended with a real paragraph break' do
        # Reproduces the 2026-09-03 conflation shape, this time with the
        # Italian portion as its own paragraph rather than a run-on sentence.
        with_break = "#{full_en}\n\nE poi c'è Seborga, con la sua Sagra del Polpo e Patate, " \
                     "tra i borghi più suggestivi della zona. Non dimenticate di visitare anche " \
                     "il centro storico, che è molto bello in questo periodo dell'anno."

        stub_claude_responses(full_it, with_break)

        expect { subject.generate }.to raise_error(described_class::Error, /contains an Italian sentence/)
      end

      # The actual 2026-10-17 production bug: the old validator rejected ANY
      # accented character anywhere, so a faithful translation that legitimately
      # quotes an Italian title (event names, song titles) failed deterministically
      # on every attempt -- not a sampling fluke, every retry hit the same rejection.
      it 'does NOT raise when the translation faithfully quotes an accented Italian title' do
        faithful_en = <<~EN
          Good morning, dear community! Today brings a wonderful lineup of events across our beloved Riviera.

          In Pieve di Teco, don't miss the Alpine Popular Cuisine Festival, celebrating the mountain flavors of our region with tastings, music and tradition.

          Meanwhile in Sanremo, the city once again becomes the capital of the Italian songwriter, with a special evening titled "Il Tenco sfida il tempo degli algoritmi" exploring music, memory and freedom in the age of technology.

          Don't miss the Parr-rock choir returning to Teatro Cavour with "Laudato sì... ma rock", a joyful blend of gospel and rock energy.

          Whatever you choose, come celebrate the season with us -- visit miacivezza.com for full details on every event.
        EN

        stub_claude_responses(full_it, faithful_en)

        expect { subject.generate }.not_to raise_error
      end

      # A real false positive found while tuning against all 84 stored
      # production digests (2026-10-17): a short bilingual book title with
      # its English gloss in parentheses, immediately adjacent, has a high
      # Italian-word ratio purely because the sentence itself is short.
      it 'does NOT raise on a short bilingual title with its English gloss alongside it' do
        faithful_en = "#{full_en}Nicola Perullo presents his book Contro i cuochi. " \
                      'Per amore della cucina* (*Against Chefs. For the Love of Cooking) ' \
                      'in Piazza della Vittoria at 9:30 pm.'

        stub_claude_responses(full_it, faithful_en)

        expect { subject.generate }.not_to raise_error
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
