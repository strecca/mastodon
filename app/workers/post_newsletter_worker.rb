# frozen_string_literal: true

class PostNewsletterWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'default', retry: 3

  def perform(newsletter_id)
    newsletter = CommunityNewsletter.find_by(id: newsletter_id)
    return unless newsletter&.published?
    return if newsletter.mastodon_status_id.present?

    admin_account = Account.find_local(Setting.site_contact_username.strip.gsub(/\A@/, ''))
    return unless admin_account

    url = "https://#{Rails.configuration.x.web_domain}/newsletters/#{newsletter.slug}"

    # newsletter.mastodon_status_id only guards THIS database row. If the
    # newsletter was deleted and re-imported (e.g. to backfill a new
    # column), the fresh row has a blank mastodon_status_id even though a
    # status for this exact slug was already posted and never cleaned up.
    # Guard by slug too, since the URL embedded in the post text is unique
    # per newsletter regardless of which row posted it.
    existing = admin_account.statuses.where('text LIKE ?', "%#{url}%").first
    if existing
      newsletter.update_column(:mastodon_status_id, existing.id.to_s)
      return
    end

    text = "#{newsletter.title}\n\nDi #{newsletter.author_name} | #{newsletter.masthead_location.presence || 'Civezza'}\n\n#{url}"

    status = PostStatusService.new.call(
      admin_account,
      text:       text,
      visibility: :public
    )

    newsletter.update_column(:mastodon_status_id, status.id.to_s)
  rescue ActiveRecord::RecordNotFound
    nil
  end
end
