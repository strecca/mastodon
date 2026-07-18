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

    url  = "https://#{Rails.configuration.x.web_domain}/newsletters/#{newsletter.slug}"
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
