# frozen_string_literal: true

# Writes the "Welcome back" digest for one member: a short, natural-language
# summary of Community Directory notifications, native Mastodon notifications
# (mentions/favourites/follows), and posts from followed accounts since their
# last visit. Called from MemberWelcomeDigestWorker, at most once per member
# per day (the worker owns that guarantee — this service does one thing:
# gather bounded data, and if there's anything to report, ask Claude to write
# it up).
#
# Usage:
#   MemberWelcomeDigestService.new(account).generate(since: 1.day.ago)
class MemberWelcomeDigestService
  Error = Class.new(StandardError)

  MODEL      = 'claude-haiku-4-5'
  MAX_TOKENS = 512

  # Cap per data source — keeps the prompt (and therefore cost) bounded no
  # matter how many people a member follows or how much community activity
  # piled up. MemberNotificationTarget accounts are prioritized within the
  # followed-posts source when trimming, but nothing here is filtered by
  # preference — deliberately simple, see the plan's scope decision.
  MAX_ITEMS_PER_SOURCE = 18

  OUTPUT_SCHEMA = {
    type: 'object',
    properties: {
      has_update: { type: 'boolean' },
      summary: { type: 'string' },
    },
    required: %w(has_update summary),
    additionalProperties: false,
  }.freeze

  SYSTEM_PROMPT = <<~SYSTEM.freeze
    You are writing a short "welcome back" note for a member of MiaCivezza.com,
    a private community platform for people connected to the Imperia province
    and the Ligurian Riviera of northwestern Italy.

    You will be given a list of things that happened since the member's last
    visit: posts from people they follow, mentions/favourites/follows they
    received, and Community Directory notifications (new listings, events,
    restaurants, properties, artists, or member stories in categories they
    subscribed to, or posts from members they specifically follow there). Each
    item includes a URL in parentheses at the end of its line.

    Write 2-3 warm, natural sentences summarizing the most interesting or
    relevant items — like a friend catching them up, not a system log. Address
    the member by name if given. Do not list every item mechanically; pick out
    what's genuinely worth mentioning and mention specific people and what they
    did. Never invent details beyond what's given. If nothing is worth
    mentioning, say so plainly and briefly instead.

    Be specific, never vague: name the exact category (e.g. "Restaurants", not
    "a category you follow"), the exact person, the exact place. For every item
    you mention, turn it into a markdown link using EXACTLY the URL given for
    that item — for example "a new Restaurants listing" becomes
    "[a new Restaurants listing](/community_restaurants/42)". Do not invent or
    alter a URL, and do not paste a bare URL as plain text — always wrap it in
    markdown link syntax with real link text.
  SYSTEM

  def initialize(account)
    @account = account
  end

  # Returns the digest text (String), or nil if there's nothing worth
  # reporting (including: no activity at all, in which case Claude is never
  # called). Raises Error on an Anthropic API failure — the worker persists a
  # nil-content row when that happens rather than leaving no row, so the
  # once-per-day guarantee holds even after a failed attempt.
  def generate(since:)
    community_notifications = fetch_community_notifications(since)
    native_notifications    = fetch_native_notifications(since)
    followed_posts          = fetch_followed_posts(since)

    return nil if community_notifications.empty? && native_notifications.empty? && followed_posts.empty?

    call_claude(community_notifications, native_notifications, followed_posts)
  end

  private

  def fetch_community_notifications(since)
    CommunityEntryNotification
      .where(recipient_account_id: @account.id, created_at: since..)
      .order(created_at: :desc)
      .limit(MAX_ITEMS_PER_SOURCE)
      .to_a
  end

  def fetch_native_notifications(since)
    Notification
      .where(account_id: @account.id, type: %w(mention favourite follow), created_at: since..)
      .order(created_at: :desc)
      .limit(MAX_ITEMS_PER_SOURCE)
      .to_a
  end

  def fetch_followed_posts(since)
    prioritized_ids = MemberNotificationTarget.where(account_id: @account.id).pluck(:target_account_id).to_set

    candidates = Status
                 .where(account_id: @account.following.select(:id))
                 .list_eligible_visibility
                 .where(created_at: since..)
                 .order(created_at: :desc)
                 .limit(MAX_ITEMS_PER_SOURCE * 3)
                 .to_a

    # Stable sort: targeted accounts first, otherwise most-recent first.
    candidates
      .each_with_index.sort_by { |status, index| [prioritized_ids.include?(status.account_id) ? 0 : 1, index] }
      .first(MAX_ITEMS_PER_SOURCE)
      .map(&:first)
  end

  def call_claude(community_notifications, native_notifications, followed_posts)
    api_key = ENV.fetch('ANTHROPIC_API_KEY', nil)
    raise Error, 'ANTHROPIC_API_KEY not configured in .env.production' if api_key.blank?

    client = Anthropic::Client.new(api_key: api_key)

    response = client.messages.create(
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: build_prompt(community_notifications, native_notifications, followed_posts) }],
      output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } }
    )

    parse_response(response)
  rescue Anthropic::Errors::APIStatusError, Anthropic::Errors::APIConnectionError => e
    raise Error, "Anthropic API error: #{e.message}"
  end

  def parse_response(response)
    text = response.content.first&.text.to_s
    result = JSON.parse(text)
    return nil unless result['has_update']

    result['summary'].to_s.strip.presence
  rescue JSON::ParserError => e
    raise Error, "JSON parse error: #{e.message}"
  end

  def build_prompt(community_notifications, native_notifications, followed_posts)
    locale = @account.user&.locale.presence || I18n.default_locale

    <<~PROMPT
      Member name: #{@account.display_name.presence || @account.username}
      Write the summary in this language: #{locale}

      Community Directory notifications since last visit:
      #{describe_community_notifications(community_notifications)}

      Mentions, favourites, and new followers since last visit:
      #{describe_native_notifications(native_notifications)}

      Posts from followed members since last visit:
      #{describe_followed_posts(followed_posts)}
    PROMPT
  end

  def describe_community_notifications(notifications)
    return '(none)' if notifications.empty?

    notifications.map do |n|
      category = CommunityDirectoryConfig.display_name_for(n.category_key)
      sender   = n.sender ? (n.sender.display_name.presence || n.sender.username) : nil
      url      = "/community_#{n.category_key}/#{n.notifiable_id}"

      if n.new_entry?
        sender ? "- #{sender} posted a new #{category} entry (#{url})" : "- A new #{category} entry was posted (#{url})"
      else
        "- Someone responded to your #{category} listing (#{url})"
      end
    end.join("\n")
  end

  def describe_native_notifications(notifications)
    return '(none)' if notifications.empty?

    notifications.map do |n|
      actor = n.from_account.display_name.presence || n.from_account.username

      case n.type
      when :mention
        status = n.target_status
        next unless status

        "- #{actor} mentioned you (#{status_url(status)})"
      when :favourite
        status = n.target_status
        next unless status

        "- #{actor} favourited your post (#{status_url(status)})"
      when :follow
        "- #{actor} started following you (#{account_url(n.from_account)})"
      end
    end.compact.join("\n")
  end

  def describe_followed_posts(statuses)
    return '(none)' if statuses.empty?

    statuses.map do |status|
      author  = status.account.display_name.presence || status.account.username
      snippet = ActionController::Base.helpers.strip_tags(status.text).squish.truncate(160)
      "- #{author} posted: #{snippet} (#{status_url(status)})"
    end.join("\n")
  end

  def status_url(status)
    "/@#{status.account.acct}/#{status.id}"
  end

  def account_url(account)
    "/@#{account.acct}"
  end
end
