# frozen_string_literal: true

# Parses a raw newsletter text (or PDF-extracted text) into structured
# CommunityNewsletter fields using the Anthropic API, then optionally
# extracts embedded images from a PDF via pdfimages.
#
# Usage (text only):
#   result = NewsletterImportService.new.extract(source_text: raw_text)
#   newsletter = CommunityNewsletter.new(result[:fields])
#
# Usage (PDF):
#   result = NewsletterImportService.new.extract(pdf_path: '/tmp/upload.pdf')
#   newsletter = CommunityNewsletter.new(result[:fields])
#   result[:image_paths].each { |path, meta| attach_asset(newsletter, path, meta) }

class NewsletterImportService
  Error = Class.new(StandardError)

  ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
  MAX_TOKENS    = 4096

  EXTRACTION_PROMPT = <<~PROMPT.freeze
    You are parsing a community newsletter from miacivezza.com - a bilingual (Italian/English)
    community platform for people with ties to Civezza and the Imperia province of Liguria.

    The newsletter may be bilingual (Italian and English versions of the same content on
    separate pages), or it may be a single language. It typically has:
    - A masthead location (e.g. "CIVEZZA, LA PIAZZETTA")
    - A display title (the name of the newsletter or edition)
    - A date
    - An author name and sign-off (e.g. "Barbara Hunter-Lemke")
    - A narrow left column: a personal letter, thank-you note, or sidebar
    - A wider right column: the main editorial article(s) with section headings
    - A footer attribution line

    Extract the following and respond ONLY with valid JSON (no text before or after):

    {
      "title": "display title of this edition",
      "author_name": "full name of the author",
      "published_on": "YYYY-MM-DD",
      "newsletter_template": "two_column or single_column",
      "masthead_location": "location string from the header",
      "footer_attribution": "footer text e.g. newsletter | Author | Place",

      "left_column_it": "Italian text of the narrow left column / sidebar letter",
      "left_column_en": "English text of the narrow left column / sidebar letter",
      "right_column_it": "Italian text of the main article(s), preserving section headings with ** markers",
      "right_column_en": "English text of the main article(s), preserving section headings with ** markers",
      "image_hints": [
        { "description": "brief description of any image/graphic mentioned or visible", "position": "left_column|right_column|footer|header" }
      ]
    }

    Rules:
    - If the newsletter is only in one language, leave the other language fields as ""
    - If there is no distinct left/right column split, put all content in right_column and leave left_column as ""
    - Use ** heading ** markers to preserve section headings within column text
    - published_on: infer from any date in the document; use ISO format
    - image_hints: list all graphics described or obviously present (photos, illustrations, decorative elements)
    - Never invent content not present in the source text

    SOURCE TEXT:
  PROMPT

  def extract(source_text: nil, pdf_path: nil)
    raise Error, 'Provide source_text or pdf_path' if source_text.blank? && pdf_path.blank?

    text = source_text.presence || extract_text_from_pdf(pdf_path)
    fields = call_claude(text)
    image_paths = pdf_path.present? ? extract_images_from_pdf(pdf_path) : []

    { fields: fields.merge(source_text: text), image_paths: image_paths }
  end

  private

  def extract_text_from_pdf(pdf_path)
    raise Error, "PDF not found: #{pdf_path}" unless File.exist?(pdf_path)

    # pdftotext is part of poppler-utils (standard on Ubuntu)
    output = `pdftotext -layout "#{pdf_path}" -`
    raise Error, 'pdftotext failed or returned empty output' if output.strip.blank?

    output
  end

  def extract_images_from_pdf(pdf_path)
    dir = Dir.mktmpdir('newsletter_assets_')
    `pdfimages -all "#{pdf_path}" "#{dir}/asset"`

    image_files = Dir["#{dir}/asset-*"].sort
    return [] if image_files.empty?

    classify_images(image_files)
  rescue StandardError => e
    Rails.logger.warn("NewsletterImportService: image extraction failed - #{e.message}")
    []
  end

  def classify_images(paths)
    return [] if paths.empty?

    # Build a classification prompt listing each file by index
    file_list = paths.each_with_index.map { |p, i| "#{i}: #{File.basename(p)} (#{File.size(p)} bytes)" }.join("\n")

    prompt = <<~CLASSIFY
      The following image files were extracted from a newsletter PDF.
      Classify each by its likely role and position in the layout.

      Files:
      #{file_list}

      Respond ONLY with JSON array:
      [
        { "index": 0, "role": "sidebar_graphic|editorial_photo|footer_illustration|header_graphic|logo|unknown", "position": "left_column|right_column|footer|header", "alt_text": "brief description", "keep": true|false },
        ...
      ]

      Set keep: false for logos, icons, or site branding assets already present on the website.
      Set keep: true for photos, illustrations, and decorative elements unique to this newsletter.
    CLASSIFY

    result = call_claude_raw(prompt)
    parsed = JSON.parse(result)

    parsed.filter_map do |item|
      next unless item['keep']

      {
        path:     paths[item['index']],
        role:     item['role'],
        position: item['position'],
        alt_text: item['alt_text'].to_s,
      }
    end
  rescue JSON::ParserError => e
    Rails.logger.warn("NewsletterImportService: image classification parse error - #{e.message}")
    []
  end

  def call_claude(source_text)
    prompt = "#{EXTRACTION_PROMPT}\n#{source_text.truncate(12_000)}"
    raw = call_claude_raw(prompt)

    raw = raw.gsub(/\A```(?:json)?\s*/, '').gsub(/\s*```\z/, '').strip
    match = raw.match(/\{.*\}/m)
    raise Error, "Could not extract JSON from Claude response" if match.nil?

    result = JSON.parse(match.to_s)

    {
      title:               result['title'].to_s.strip,
      author_name:         result['author_name'].to_s.strip,
      published_on:        parse_date(result['published_on']),
      newsletter_template: result['newsletter_template'].presence || 'two_column',
      masthead_location:   result['masthead_location'].to_s.strip,
      footer_attribution:  result['footer_attribution'].to_s.strip,
      left_column_it:      result['left_column_it'].to_s.strip,
      left_column_en:      result['left_column_en'].to_s.strip,
      right_column_it:     result['right_column_it'].to_s.strip,
      right_column_en:     result['right_column_en'].to_s.strip,
    }
  rescue JSON::ParserError => e
    raise Error, "JSON parse error: #{e.message}"
  end

  def call_claude_raw(prompt)
    config  = Rails.configuration.x.daily_digest.anthropic
    api_key = config[:api_key]
    model   = config[:model].presence || 'claude-sonnet-4-6'

    raise Error, 'ANTHROPIC_API_KEY not configured' if api_key.blank?

    response = HTTP
      .headers(
        'x-api-key'         => api_key,
        'anthropic-version' => '2023-06-01',
        'content-type'      => 'application/json'
      )
      .timeout(120)
      .post(ANTHROPIC_API, json: {
        model:      model,
        max_tokens: MAX_TOKENS,
        messages:   [{ role: 'user', content: prompt }],
      })

    raise Error, "Anthropic API #{response.status}: #{response.body.to_s.truncate(200)}" unless response.status.success?

    JSON.parse(response.body.to_s).dig('content', 0, 'text').to_s.strip
  end

  def parse_date(value)
    Date.parse(value.to_s)
  rescue ArgumentError, TypeError
    Date.today
  end
end
