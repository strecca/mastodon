# frozen_string_literal: true

# Parses a newsletter PDF or plain text into structured CommunityNewsletter fields
# using the Anthropic API. PDFs are sent directly as base64-encoded documents
# (works for both text-layer and image-based PDFs). Plain text files are sent as text.
#
# Usage (PDF):
#   result = NewsletterImportService.new.extract(pdf_path: '/tmp/upload.pdf')
#   newsletter = CommunityNewsletter.new(result[:fields])
#
# Usage (plain text):
#   result = NewsletterImportService.new.extract(source_text: raw_text)
#   newsletter = CommunityNewsletter.new(result[:fields])

class NewsletterImportService
  Error = Class.new(StandardError)

  ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
  MAX_TOKENS    = 4096
  MAX_PDF_MB    = 25

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

      "layout_variant": "gazette OR magazine OR letter - gazette: warm serif community newsletter with personal letter sidebar; magazine: bold image-forward layout; letter: simple single-voice prose",
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
  PROMPT

  def extract(source_text: nil, pdf_path: nil)
    raise Error, 'Provide source_text or pdf_path' if source_text.blank? && pdf_path.blank?

    if pdf_path.present?
      pdf_data    = read_pdf_base64(pdf_path)
      fields      = call_claude_pdf(pdf_data)
      tokens      = extract_design_tokens(pdf_data)
      fields[:design_tokens] = tokens if tokens.present?
      image_paths = extract_images_from_pdf(pdf_path)
      text_stored = 'Extracted via Claude Vision from PDF'
    else
      fields      = call_claude_text(source_text)
      image_paths = []
      text_stored = source_text
    end

    { fields: fields.merge(source_text: text_stored), image_paths: image_paths }
  end

  private

  def read_pdf_base64(pdf_path)
    raise Error, "PDF not found: #{pdf_path}" unless File.exist?(pdf_path)

    size_mb = File.size(pdf_path) / 1_048_576.0
    raise Error, "PDF is #{size_mb.round(1)}MB - maximum is #{MAX_PDF_MB}MB." if size_mb > MAX_PDF_MB

    Base64.strict_encode64(File.binread(pdf_path))
  end

  DESIGN_TOKEN_PROMPT = <<~PROMPT.freeze
    You are a CSS design analyst. Look at this newsletter PDF and extract its visual design as precise CSS tokens.

    Examine the actual rendered colors, typography choices, and layout proportions.
    Respond ONLY with valid JSON - no text before or after:

    {
      "bg_color": "hex color of the main content background area (e.g. #fdfaf4)",
      "ink_color": "hex color of the primary body text",
      "accent_color": "hex color of decorative rules, thin borders, or secondary elements",
      "rule_color": "hex color of the bold masthead dividing rules (top and bottom of header)",
      "sidebar_ink": "hex color of text in the narrow left column",
      "column_ratio": "left column width as integer percentage, e.g. 35 means 35/65 split",
      "body_font": "serif or sans",
      "heading_transform": "uppercase or none",
      "heading_tracking": "letter-spacing as em value e.g. 0.08em",
      "sidebar_italic_first": true or false,
      "lede_size_boost": "font-size boost for the first section heading e.g. 1.2 means 20% larger than body headings"
    }

    Sample the actual pixel colors from the document. If the background appears to be
    a warm off-white, give the closest hex. For column_ratio, estimate visually.
  PROMPT

  # Second Vision pass: extract CSS design tokens from the PDF's visual appearance.
  # Returns nil silently on failure so a bad token call never blocks the import.
  def extract_design_tokens(pdf_base64)
    config  = Rails.configuration.x.daily_digest.anthropic
    api_key = config[:api_key]
    model   = config[:model].presence || 'claude-sonnet-4-6'

    return nil if api_key.blank?

    response = HTTP
      .headers(
        'x-api-key'         => api_key,
        'anthropic-version' => '2023-06-01',
        'content-type'      => 'application/json'
      )
      .timeout(60)
      .post(ANTHROPIC_API, json: {
        model:      model,
        max_tokens: 512,
        messages:   [{
          role:    'user',
          content: [
            {
              type:   'document',
              source: {
                type:       'base64',
                media_type: 'application/pdf',
                data:       pdf_base64,
              },
            },
            { type: 'text', text: DESIGN_TOKEN_PROMPT },
          ],
        }],
      })

    return nil unless response.status.success?

    raw = JSON.parse(response.body.to_s).dig('content', 0, 'text').to_s.strip
    clean = raw.gsub(/\A```(?:json)?\s*/, '').gsub(/\s*```\z/, '').strip
    match = clean.match(/\{.*\}/m)
    return nil unless match

    parsed = JSON.parse(match.to_s)

    # Validate hex colors - reject obviously wrong values
    %w[bg_color ink_color accent_color rule_color sidebar_ink].each do |key|
      parsed.delete(key) unless parsed[key].to_s.match?(/\A#[0-9a-fA-F]{3,6}\z/)
    end

    parsed.presence
  rescue StandardError => e
    Rails.logger.warn("NewsletterImportService: design token extraction failed - #{e.message}")
    nil
  end

  # Extract embedded images from the PDF using pdfimages if available.
  # Returns an empty array (silently) if poppler-utils is not installed.
  def extract_images_from_pdf(pdf_path)
    return [] unless system('which pdfimages > /dev/null 2>&1')

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

    file_list = paths.each_with_index.map { |p, i| "#{i}: #{File.basename(p)} (#{File.size(p)} bytes)" }.join("\n")

    prompt = <<~CLASSIFY
      The following image files were extracted from a newsletter PDF.
      Classify each by its likely role and position in the layout.

      Files:
      #{file_list}

      Respond ONLY with JSON array:
      [
        { "index": 0, "role": "sidebar_graphic|editorial_photo|footer_illustration|header_graphic|logo|unknown", "position": "left_column|right_column|footer|header", "alt_text": "brief description", "keep": true },
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

  # Claude API call with a base64-encoded PDF document as content
  def call_claude_pdf(pdf_base64)
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
      .timeout(180)
      .post(ANTHROPIC_API, json: {
        model:      model,
        max_tokens: MAX_TOKENS,
        messages:   [{
          role:    'user',
          content: [
            {
              type:   'document',
              source: {
                type:       'base64',
                media_type: 'application/pdf',
                data:       pdf_base64,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT + "\n\nPlease read the attached newsletter PDF and extract the structured content as JSON.",
            },
          ],
        }],
      })

    raise Error, "Anthropic API #{response.status}: #{response.body.to_s.truncate(200)}" unless response.status.success?

    raw = JSON.parse(response.body.to_s).dig('content', 0, 'text').to_s.strip
    parse_claude_json(raw)
  end

  # Claude API call with plain text content
  def call_claude_text(source_text)
    prompt = "#{EXTRACTION_PROMPT}\n\nSOURCE TEXT:\n#{source_text.truncate(12_000)}"
    raw    = call_claude_raw(prompt)
    parse_claude_json(raw)
  end

  # Raw Claude API call returning the text response
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

  def parse_claude_json(raw)
    clean = raw.gsub(/\A```(?:json)?\s*/, '').gsub(/\s*```\z/, '').strip
    match = clean.match(/\{.*\}/m)
    raise Error, 'Could not extract JSON from Claude response' if match.nil?

    result = JSON.parse(match.to_s)

    {
      layout_variant:      result['layout_variant'].presence&.then { |v| CommunityNewsletter::LAYOUT_VARIANTS.include?(v) ? v : 'gazette' } || 'gazette',
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

  def parse_date(value)
    Date.parse(value.to_s)
  rescue ArgumentError, TypeError
    Date.today
  end
end
