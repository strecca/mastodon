# frozen_string_literal: true

class Web::PushNotificationWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'push', retry: 5

  TTL = 48.hours

  def perform(subscription_id, notification_id)
    @subscription = Web::PushSubscription.find(subscription_id)
    @notification = Notification.find(notification_id)

    return if @notification.updated_at < TTL.ago

    # Polymorphically associated activity could have been deleted
    # in the meantime, so we have to double-check before proceeding
    return unless @notification.activity.present? && @subscription.pushable?(@notification)

    WebPushDeliveryService.new.call(@subscription, push_notification_json)
  rescue ActiveRecord::RecordNotFound
    true
  end

  private

  def push_notification_json
    I18n.with_locale(@subscription.locale.presence || I18n.default_locale) do
      serialized_notification.to_json
    end
  end

  def serialized_notification
    ActiveModelSerializers::SerializableResource.new(
      @notification,
      serializer: Web::NotificationSerializer,
      scope: @subscription,
      scope_name: :current_push_subscription
    )
  end
end
