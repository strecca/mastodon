# frozen_string_literal: true

# Shared Web Push encryption + delivery logic. Extracted from
# Web::PushNotificationWorker so it can be reused by community-directory
# notification delivery, which has no Mastodon Notification object to
# serialize — callers build their own JSON payload and hand it in, along with
# the target subscription; this service owns the actual Web Push protocol
# work (legacy vs. standard encryption, headers, and cleaning up subscriptions
# the push service reports as dead).
class WebPushDeliveryService
  include RoutingHelper

  TTL     = 48.hours
  URGENCY = 'normal'

  def call(subscription, payload_json)
    @subscription = subscription

    # Clean up old Web::PushSubscriptions that were added before validation of
    # the endpoint and keys: #30542, #30540
    unless @subscription.valid?
      Rails.logger.debug { "Web::PushSubscription is invalid, removing: #{@subscription.id}" }
      @subscription.destroy!
      return
    end

    if web_push_request.legacy
      perform_legacy_request(payload_json)
    else
      perform_standard_request(payload_json)
    end
  end

  private

  def perform_legacy_request(payload_json)
    payload = web_push_request.legacy_encrypt(payload_json)

    request_pool.with(web_push_request.audience) do |http_client|
      request = Request.new(:post, web_push_request.endpoint, body: payload.fetch(:ciphertext), http_client: http_client)

      request.add_headers(
        'Content-Type' => 'application/octet-stream',
        'Ttl' => TTL.to_s,
        'Urgency' => URGENCY,
        'Content-Encoding' => 'aesgcm',
        'Encryption' => "salt=#{Webpush.encode64(payload.fetch(:salt)).delete('=')}",
        'Crypto-Key' => "dh=#{Webpush.encode64(payload.fetch(:server_public_key)).delete('=')};#{web_push_request.crypto_key_header}",
        'Authorization' => web_push_request.legacy_authorization_header,
        'Unsubscribe-URL' => subscription_url
      )

      deliver(request)
    end
  end

  def perform_standard_request(payload_json)
    payload = web_push_request.standard_encrypt(payload_json)

    request_pool.with(web_push_request.audience) do |http_client|
      request = Request.new(:post, web_push_request.endpoint, body: payload, http_client: http_client)

      request.add_headers(
        'Content-Type' => 'application/octet-stream',
        'Ttl' => TTL.to_s,
        'Urgency' => URGENCY,
        'Content-Encoding' => 'aes128gcm',
        'Authorization' => web_push_request.standard_authorization_header,
        'Unsubscribe-URL' => subscription_url,
        'Content-Length' => payload.length.to_s
      )

      deliver(request)
    end
  end

  def deliver(request)
    request.perform do |response|
      # If the server responds with an error in the 4xx range
      # that isn't about rate-limiting or timeouts, we can
      # assume that the subscription is invalid or expired
      # and must be removed

      if (400..499).cover?(response.code) && ![408, 429].include?(response.code)
        @subscription.destroy!
      elsif !(200...300).cover?(response.code)
        raise Mastodon::UnexpectedResponseError, response
      end
    end
  end

  def web_push_request
    @web_push_request ||= WebPushRequest.new(@subscription)
  end

  def request_pool
    RequestPool.current
  end

  def subscription_url
    api_web_push_subscription_url(id: @subscription.generate_token_for(:unsubscribe))
  end
end
