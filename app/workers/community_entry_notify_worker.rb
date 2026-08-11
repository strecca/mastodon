# frozen_string_literal: true

# Fans out Community Directory notifications to interested members.
#
# kind: 'new_entry' — called when any entry is created (Listings, Events,
#   Restaurants, Properties, Artists, Member Stories). Notifies accounts
#   subscribed to that category (MemberNotificationCategorySubscription) or
#   specifically targeting the poster (MemberNotificationTarget).
#
# kind: 'entry_response' — Listings only, for now. Called when a listing gets
#   a response (CommunityListingInterest created). Notifies accounts watching
#   that specific listing (CommunityEntryWatch).
#
# Delivery: always creates the CommunityEntryNotification inbox row. Push is
# fired immediately unless the recipient is in their quiet-hours window, in
# which case Scheduler::MemberNotificationFlushScheduler picks it up later.
# Email is entirely the scheduler's responsibility (immediate vs digest
# frequency), not fired from here.
class CommunityEntryNotifyWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'default', retry: 3

  def perform(kind, record_class_name, record_id, category_key = nil)
    record = record_class_name.constantize.find(record_id)

    case kind.to_s
    when 'new_entry'
      notify_new_entry(record, category_key)
    when 'entry_response'
      notify_entry_response(record)
    end
  rescue ActiveRecord::RecordNotFound
    # entry (or interest) deleted before the job ran — nothing to do
  end

  private

  def notify_new_entry(entry, category_key)
    poster_id = entry.account_id
    recipient_ids = interested_recipient_ids(category_key, poster_id) - [poster_id]
    return if recipient_ids.empty?

    Account.where(id: recipient_ids).find_each do |recipient|
      create_and_deliver(recipient: recipient, sender_id: poster_id, entry: entry,
                          category_key: category_key, kind: :new_entry)
    end
  end

  def notify_entry_response(interest)
    listing = interest.community_listing
    watcher_ids = CommunityEntryWatch.where(watchable: listing).pluck(:account_id) -
                  [interest.account_id, listing.account_id]
    return if watcher_ids.empty?

    Account.where(id: watcher_ids).find_each do |recipient|
      create_and_deliver(recipient: recipient, sender_id: interest.account_id, entry: listing,
                          category_key: 'listings', kind: :entry_response)
    end
  end

  def interested_recipient_ids(category_key, poster_id)
    by_category = MemberNotificationCategorySubscription.where(category_key: category_key).pluck(:account_id)
    by_target   = MemberNotificationTarget.where(target_account_id: poster_id).pluck(:account_id)
    (by_category + by_target).uniq
  end

  def create_and_deliver(recipient:, sender_id:, entry:, category_key:, kind:)
    notification = CommunityEntryNotification.create!(
      recipient_account_id: recipient.id,
      sender_account_id:    sender_id,
      notifiable:            entry,
      category_key:          category_key,
      kind:                  kind
    )

    preference = MemberNotificationPreference.for_account(recipient)
    return if preference.in_quiet_hours?

    CommunityEntryPushWorker.perform_async(notification.id)
  end
end
