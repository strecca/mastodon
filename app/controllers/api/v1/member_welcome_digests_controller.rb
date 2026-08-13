# frozen_string_literal: true

# One "Welcome back" digest row exists per account per day (see
# MemberWelcomeDigestWorker) — this controller just reads today's row for the
# current member and lets the frontend mark it viewed once shown. Generation
# is never triggered from here; it's enqueued from UserTrackingConcern on
# sign-in, so `show` only ever reports state — it never kicks off work.
class Api::V1::MemberWelcomeDigestsController < Api::BaseController
  include AsyncRefreshesConcern

  before_action :require_user!

  def show
    digest = today_digest

    if digest
      # `viewed?` matters here, not just `content?` — once the popup has been
      # shown and dismissed, later checks the same day (a PWA reopened
      # several times, a page reload, another tab) must report `none`, or the
      # popup would reappear on every check until the calendar date rolls
      # over instead of showing exactly once.
      available = digest.content? && !digest.viewed?
      render json: { state: available ? 'available' : 'none', content: available ? digest.content : nil }
    else
      async_refresh = AsyncRefresh.new(refresh_key)

      if async_refresh.running?
        add_async_refresh_header(async_refresh, retry_seconds: 3)
        render json: { state: 'generating' }
      else
        render json: { state: 'none' }
      end
    end
  end

  def read
    today_digest&.view!
    render_empty
  end

  private

  def today_digest
    MemberWelcomeDigest.find_by(account_id: current_account.id, digest_date: Date.current)
  end

  def refresh_key
    "welcome_digest:#{current_account.id}:#{Date.current}"
  end
end
