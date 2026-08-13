# frozen_string_literal: true

module UserTrackingConcern
  extend ActiveSupport::Concern

  SIGN_IN_UPDATE_FREQUENCY = 24.hours.freeze

  included do
    before_action :update_user_sign_in
  end

  private

  def update_user_sign_in
    return unless user_needs_sign_in_update?

    previous_sign_in_at = current_user.current_sign_in_at
    current_user.update_sign_in!
    enqueue_welcome_digest(previous_sign_in_at)
  end

  def user_needs_sign_in_update?
    user_signed_in? && (current_user.current_sign_in_at.nil? || current_user.current_sign_in_at < SIGN_IN_UPDATE_FREQUENCY.ago)
  end

  # Piggybacks on the sign-in throttle above as the "member is actually
  # active today" signal for the Welcome Back Digest feature — this fires at
  # most once per rolling 24h, which is exactly the cadence that feature
  # needs. `previous_sign_in_at` is nil on a brand-new account's very first
  # sign-in, in which case there's no "since" to summarize, so nothing is
  # enqueued.
  def enqueue_welcome_digest(previous_sign_in_at)
    return if previous_sign_in_at.nil?

    account_id = current_user.account_id
    digest_date = Date.current
    redis_key = "welcome_digest:#{account_id}:#{digest_date}"

    return if AsyncRefresh.exists?(redis_key)
    return if MemberWelcomeDigest.exists?(account_id: account_id, digest_date: digest_date)

    AsyncRefresh.create(redis_key)
    MemberWelcomeDigestWorker.perform_async(account_id, previous_sign_in_at.iso8601)
  end
end
