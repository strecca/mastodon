# frozen_string_literal: true

# Emails an admin alert on unhandled Rails exceptions (real 500s), using the
# same AdminAlertMailer already wired for Sidekiq job-death alerts. Rails
# automatically reports unhandled controller exceptions to Rails.error before
# rendering the error page, so subscribing here needs no ApplicationController
# or middleware changes.
#
# Deduped per exception class+message for 15 minutes via Rails.cache so a
# repeatedly-failing request (e.g. a bad deploy) sends one alert, not one per
# request.

class AdminExceptionNotifier
  DEDUPE_WINDOW = 15.minutes

  # Routing/record-lookup noise from bad URLs and bots — not real defects.
  IGNORED_CLASSES = %w[
    ActiveRecord::RecordNotFound
    ActionController::RoutingError
    ActionController::InvalidAuthenticityToken
  ].freeze

  def report(error, handled:, severity:, context:, source: nil)
    return if handled
    return if IGNORED_CLASSES.include?(error.class.name)

    cache_key = "admin_alert:exception:#{error.class}:#{Digest::MD5.hexdigest(error.message.to_s)}"
    return unless Rails.cache.write(cache_key, true, unless_exist: true, expires_in: DEDUPE_WINDOW)

    AdminAlertMailer.rails_exception(error, context).deliver_later
  rescue => e
    Rails.logger.error("[AdminAlert] Failed to report exception: #{e.message}")
  end
end

Rails.error.subscribe(AdminExceptionNotifier.new)
