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
  # Sidekiq's own internal control-flow exceptions are also ignored here:
  # Sidekiq reports job failures to Rails.error itself, wrapped in classes
  # like Sidekiq::JobRetry::Handled. These aren't real application errors —
  # job-death alerting already happens with better context via the
  # death_handlers lambda in sidekiq_callbacks.rb — so alerting on them here
  # too would just be redundant noise.
  #
  # ActionDispatch::RemoteIp::IpSpoofAttackError: raised when a request sends
  # conflicting Client-Ip/X-Forwarded-For headers (e.g. a forged
  # "Client-Ip: 127.0.0.1" trying to slip past IP-based rate limiting).
  # Confirmed live 2026-09-04: 180 of these in one day from 4 rotating IPs on
  # generic scanning-hosting infrastructure -- routine automated internet
  # scanning, not a targeted attack. Rails' own anti-spoofing check is doing
  # exactly its job by raising instead of guessing; the request fails safely
  # either way, so there's nothing actionable per occurrence.
  IGNORED_CLASSES = %w[
    ActiveRecord::RecordNotFound
    ActionController::RoutingError
    ActionController::InvalidAuthenticityToken
    Sidekiq::JobRetry::Handled
    Sidekiq::JobRetry::Skip
    ActionDispatch::RemoteIp::IpSpoofAttackError
  ].freeze

  def report(error, handled:, severity:, context:, source: nil)
    return if handled
    return if IGNORED_CLASSES.include?(error.class.name)

    cache_key = "admin_alert:exception:#{error.class}:#{Digest::MD5.hexdigest(error.message.to_s)}"
    return unless Rails.cache.write(cache_key, true, unless_exist: true, expires_in: DEDUPE_WINDOW)

    # Pass plain strings/arrays, not the exception itself -- deliver_later
    # enqueues this through ActiveJob, which can't serialize a raw exception
    # object as a job argument. Confirmed live 2026-09-03: this crashed with
    # ActiveJob::SerializationError on every single call, meaning this
    # notifier had been silently failing to alert on any real unhandled
    # Rails exception since it was added 2026-08-14.
    AdminAlertMailer.rails_exception(
      exception_class: error.class.name,
      error_message: error.message.to_s,
      backtrace: Array(error.backtrace).first(8),
      context: context.presence&.inspect || 'none'
    ).deliver_later
  rescue => e
    Rails.logger.error("[AdminAlert] Failed to report exception: #{e.message}")
  end
end

Rails.error.subscribe(AdminExceptionNotifier.new)
