# frozen_string_literal: true

# Delivers one CommunityEntryNotification as a Web Push to every active push
# subscription the recipient has — mirrors Web::PushNotificationWorker's
# per-subscription fan-out, but for community-directory content instead of a
# native Mastodon Notification (which the push pipeline is otherwise
# hard-wired to). Reuses WebPushDeliveryService for the actual encryption and
# delivery; only payload-building is community-specific here.
class CommunityEntryPushWorker
  include Sidekiq::Worker
  include RoutingHelper

  sidekiq_options queue: 'push', retry: 3

  def perform(community_entry_notification_id)
    @notification = CommunityEntryNotification.find(community_entry_notification_id)
    return if @notification.browser_pushed_at.present?

    subscriptions = Web::PushSubscription.where(user_id: @notification.recipient.user_id)
    return if subscriptions.none?

    subscriptions.find_each { |subscription| deliver(subscription) }
    @notification.update_column(:browser_pushed_at, Time.current)
  rescue ActiveRecord::RecordNotFound
    true
  end

  private

  def deliver(subscription)
    WebPushDeliveryService.new.call(subscription, payload_json(subscription))
  end

  def payload_json(subscription)
    locale = subscription.locale.presence || I18n.default_locale

    I18n.with_locale(locale) do
      {
        access_token: subscription.associated_access_token,
        preferred_locale: locale,
        community_entry_notification_id: @notification.id,
        title: title,
        body: body,
        icon: icon,
        url: entry_url,
      }.to_json
    end
  end

  def category_display_name
    CommunityDirectoryConfig.display_name_for(@notification.category_key)
  end

  def title
    if @notification.new_entry?
      I18n.t('community_entry_notification.new_entry_title', category: category_display_name)
    else
      I18n.t('community_entry_notification.entry_response_title')
    end
  end

  def body
    sender = @notification.sender
    return I18n.t('community_entry_notification.default_body') unless sender

    I18n.t('community_entry_notification.body', name: sender.display_name.presence || sender.username)
  end

  # A plain root-relative path — the browser resolves it against the site's
  # own origin client-side (same as the service worker's own '/badge.png'
  # reference), so this deliberately skips full_asset_url, which is for
  # storage-backed URLs like account avatars, not static public files.
  def icon
    sender = @notification.sender
    return '/android-chrome-192x192.png' unless sender&.avatar_static_url.present?

    full_asset_url(sender.avatar_static_url)
  end

  def entry_url
    "/community_#{@notification.category_key}/#{@notification.notifiable_id}"
  end
end
