# frozen_string_literal: true

require 'rails_helper'

RSpec.describe NewsletterImportService do
  subject { described_class.new }

  # Scoped to the plain-text import path (call_claude_text -> parse_claude_json).
  # The PDF path additionally shells out to pdftotext/pdfimages, which would
  # need its own fixture/mocking infrastructure -- out of scope here. This
  # covers the part most likely to silently regress: mapping Claude's JSON
  # response onto CommunityNewsletter fields, and failing loudly (not
  # silently) when that response is malformed.
  around do |example|
    original = Rails.configuration.x.daily_digest.anthropic
    Rails.configuration.x.daily_digest.anthropic = { api_key: 'test-key', model: 'claude-test' }
    example.run
    Rails.configuration.x.daily_digest.anthropic = original
  end

  def stub_anthropic(body:, status: 200)
    stub_request(:post, NewsletterImportService::ANTHROPIC_API)
      .to_return(status: status, body: body, headers: { 'Content-Type' => 'application/json' })
  end

  def claude_envelope(text)
    { content: [{ type: 'text', text: text }] }.to_json
  end

  describe '#extract' do
    context 'with a well-formed Claude JSON response' do
      before do
        stub_anthropic(body: claude_envelope({
          title: 'Il Suono di Civezza',
          author_name: 'Barbara Hunter-Lemke',
          published_on: '2026-07-18',
          layout_variant: 'gazette',
          masthead_location: 'CIVEZZA, LA PIAZZETTA',
          footer_attribution: 'newsletter | Barbara | Civezza',
          left_column_it: 'Cara comunità...',
          left_column_en: 'Dear community...',
          right_column_it: 'Articolo principale',
          right_column_en: 'Main article',
        }.to_json))
      end

      it 'maps the response onto the expected field names' do
        result = subject.extract(source_text: 'raw newsletter text')

        expect(result[:fields]).to include(
          title: 'Il Suono di Civezza',
          author_name: 'Barbara Hunter-Lemke',
          layout_variant: 'gazette',
          right_column_en: 'Main article'
        )
      end

      it 'stores the original source text verbatim' do
        result = subject.extract(source_text: 'raw newsletter text')

        expect(result[:fields][:source_text]).to eq('raw newsletter text')
      end

      it 'returns no extracted image paths for the text path' do
        result = subject.extract(source_text: 'raw newsletter text')

        expect(result[:image_paths]).to eq([])
      end
    end

    context 'when Claude wraps the JSON in a markdown code fence' do
      before do
        fenced = "```json\n#{{ title: 'Fenced Edition', author_name: 'A' }.to_json}\n```"
        stub_anthropic(body: claude_envelope(fenced))
      end

      it 'still parses it correctly' do
        result = subject.extract(source_text: 'x')

        expect(result[:fields][:title]).to eq('Fenced Edition')
      end
    end

    context 'when Claude returns an unrecognized layout_variant' do
      before do
        stub_anthropic(body: claude_envelope({ title: 'X', author_name: 'Y', layout_variant: 'not_a_real_variant' }.to_json))
      end

      it 'falls back to gazette rather than saving an invalid value' do
        result = subject.extract(source_text: 'x')

        expect(result[:fields][:layout_variant]).to eq('gazette')
      end
    end

    context 'when Claude responds with text that contains no JSON at all' do
      before { stub_anthropic(body: claude_envelope('Sorry, I cannot process this document.')) }

      it 'raises a NewsletterImportService::Error instead of silently returning garbage' do
        expect { subject.extract(source_text: 'x') }
          .to raise_error(NewsletterImportService::Error, /Could not extract JSON/)
      end
    end

    context 'when the Anthropic API returns an error status' do
      before { stub_anthropic(body: '{"error": "rate limited"}', status: 429) }

      it 'raises a NewsletterImportService::Error' do
        expect { subject.extract(source_text: 'x') }
          .to raise_error(NewsletterImportService::Error, /Anthropic API 429/)
      end
    end

    context 'when no API key is configured' do
      around do |example|
        original = Rails.configuration.x.daily_digest.anthropic
        Rails.configuration.x.daily_digest.anthropic = { api_key: nil, model: 'claude-test' }
        example.run
        Rails.configuration.x.daily_digest.anthropic = original
      end

      it 'raises a clear configuration error rather than an obscure HTTP failure' do
        expect { subject.extract(source_text: 'x') }
          .to raise_error(NewsletterImportService::Error, 'ANTHROPIC_API_KEY not configured')
      end
    end

    context 'with neither source_text nor pdf_path' do
      it 'raises immediately without making any API call' do
        expect { subject.extract }.to raise_error(NewsletterImportService::Error, /Provide source_text or pdf_path/)
      end
    end
  end
end
