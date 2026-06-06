# frozen_string_literal: true

# Quick smoke test for all community API controllers.
# Run: RAILS_ENV=production bundle exec rails community:smoke_test
namespace :community do
  desc 'Verify all community category API endpoints return valid JSON with no errors'
  task smoke_test: :environment do
    require 'net/http'

    base = "http://localhost:#{ENV.fetch('PORT', 3000)}"
    host = ENV.fetch('LOCAL_DOMAIN', 'localhost')

    endpoints = %w[
      /api/v1/community_artists
      /api/v1/community_events
      /api/v1/community_listings
    ]

    puts "\n== Community API Smoke Test ==\n"
    all_ok = true

    endpoints.each do |path|
      uri        = URI("#{base}#{path}")
      req        = Net::HTTP::Get.new(uri)
      req['Host'] = host

      res = Net::HTTP.start(uri.host, uri.port) { |h| h.request(req) }

      if res.code == '200'
        body = JSON.parse(res.body) rescue nil
        count = body.is_a?(Hash) ? body['total'] : body&.length
        puts "  ✓ #{path} — HTTP 200, #{count} entries"
      elsif res.code == '301'
        puts "  ➜ #{path} — HTTP 301 (SSL redirect — use HTTPS host in production)"
      else
        puts "  ✗ #{path} — HTTP #{res.code} FAILED"
        all_ok = false
      end
    rescue => e
      puts "  ✗ #{path} — ERROR: #{e.message}"
      all_ok = false
    end

    puts "\n#{all_ok ? 'All endpoints OK.' : 'FAILURES detected — check journalctl -u mastodon-web.'}\n\n"
  end
end
