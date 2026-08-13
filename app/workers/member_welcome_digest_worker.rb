# frozen_string_literal: true

# Generates one member's "Welcome back" digest for today, at most once. This
# is deliberately the most idempotency-guarded worker in the codebase: a
# duplicate run means a duplicate Claude API call, which this feature's
# entire design (see the plan) exists to prevent. Three layers, cheapest
# first:
#   1. sidekiq-unique-jobs (`lock: :until_executed`) — two enqueues for the
#      same args collapse into one run.
#   2. MemberWelcomeDigest's DB unique index on (account_id, digest_date) —
#      the hard backstop, checked before any Claude call is made.
#   3. `retry: 0` — a transient failure must NOT retry. Sidekiq's automatic
#      retry would risk a second Claude call for a day that already has a
#      (possibly failed) row; instead a failed day gets a nil-content row and
#      simply doesn't get a digest, rather than being retried into a
#      duplicate spend.
#
# Enqueued from UserTrackingConcern, at most once per member per rolling 24h
# (piggybacking on the existing sign-in throttle) — never from the request
# path, and never on demand.
class MemberWelcomeDigestWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'default', retry: 0, lock: :until_executed, lock_ttl: 1.day.to_i

  def perform(account_id, since_iso)
    digest_date = Date.current
    return if MemberWelcomeDigest.exists?(account_id: account_id, digest_date: digest_date)

    async_refresh = AsyncRefresh.new(refresh_key(account_id, digest_date))
    account = Account.find(account_id)

    content = MemberWelcomeDigestService.new(account).generate(since: Time.zone.parse(since_iso))
    MemberWelcomeDigest.create!(account_id: account_id, digest_date: digest_date, content: content)
  rescue MemberWelcomeDigestService::Error => e
    Rails.logger.error("MemberWelcomeDigestWorker failed for account #{account_id}: #{e.message}")
    MemberWelcomeDigest.find_or_create_by(account_id: account_id, digest_date: digest_date)
  rescue ActiveRecord::RecordNotFound, ActiveRecord::RecordNotUnique
    true
  ensure
    async_refresh&.finish!
  end

  private

  def refresh_key(account_id, digest_date)
    "welcome_digest:#{account_id}:#{digest_date}"
  end
end
