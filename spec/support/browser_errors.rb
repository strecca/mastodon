# frozen_string_literal: true

module BrowserErrorsHelpers
  def ignore_js_error(error)
    @ignored_js_errors_for_spec << error
  end

  def error_message(error)
    error.keys.map { |key| "#{key.to_s.titleize}: #{error[key]}" }.join("\n")
  end
end

RSpec.configure do |config|
  config.include BrowserErrorsHelpers, :js, type: :system

  config.before(:each, :js, type: :system) do |example|
    @ignored_js_errors_for_spec = []

    example.metadata[:js_console_messages] ||= []
    Capybara.current_session.driver.with_playwright_page do |page|
      page.on('console', lambda { |msg|
        example.metadata[:js_console_messages] << { type: msg.type, text: msg.text, location: msg.location, page: msg.page.url }
      })
    end
  end

  config.after(:each, :js, type: :system) do |example|
    # Classes of intermittent ignorable errors
    ignored_errors = [
      /Error while trying to use the following icon from the Manifest/, # https://github.com/mastodon/mastodon/pull/30793
      /Manifest: Line: 1, column: 1, Syntax error/, # Similar parsing/interruption issue as above
    ].concat(@ignored_js_errors_for_spec)

    # This fork's front page (community_landing) asks for today's daily digest,
    # and the API answers 404 by design when none exists yet -- the page treats
    # that as "no digest". In an empty test database that's always, so ignore
    # exactly that 404, matched by URL as well as text.
    expected_by_url = lambda do |msg|
      msg[:text].include?('status of 404') &&
        msg.dig(:location, 'url').to_s.end_with?('/api/v1/community_daily_digests/today')
    end

    errors = example.metadata[:js_console_messages].reject do |msg|
      ignored_errors.any? { |pattern| pattern.match(msg[:text]) } || expected_by_url.call(msg)
    end

    if errors.present?
      aggregate_failures 'browser errrors' do
        errors.each do |error|
          expect(error[:type]).to_not eq('error'), error_message(error)
          next unless error[:type] == 'warning'

          warn 'WARN: browser warning'
          warn error[:text]
        end
      end
    end
  end
end
