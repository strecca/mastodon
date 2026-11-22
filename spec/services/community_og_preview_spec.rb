# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CommunityOgPreview do
  subject { described_class.new('https://example.com') }

  describe 'newsletter description text' do
    # og:description is escaped by the view, so the service must hand it plain
    # text. Rails 8.1.4.1's strip_tags encodes quotes, which would otherwise show
    # up as a literal &#39; in WhatsApp/Facebook link previews.
    it 'strips tags and leaves plain characters, not HTML entities' do
      text = subject.send(:strip_markup, %(<p>L'evento &amp; la "festa" <b>a Civezza</b></p>))

      expect(text).to eq(%(L'evento & la "festa" a Civezza))
      expect(text).to_not be_html_safe
    end
  end
end
