# frozen_string_literal: true

class CreateMemberNotificationPreferences < ActiveRecord::Migration[7.2]
  def change
    # One row per account. Governs Community Directory notifications only —
    # native Mastodon notification types (mentions/follows/etc.) are untouched
    # and remain on the existing per-device Web::PushSubscription toggles.
    create_table :member_notification_preferences do |t|
      t.references :account, null: false, foreign_key: true, index: { unique: true }

      # 0=never 1=immediate 2=digest
      t.integer :email_frequency, null: false, default: 2

      t.boolean  :quiet_hours_enabled, null: false, default: false
      t.time     :quiet_hours_start
      t.time     :quiet_hours_end
      t.string   :quiet_hours_timezone, null: false, default: 'UTC'

      t.timestamps
    end

    # "Which Community Directory categories does this account want to hear
    # about" — a join table (not a JSON column) because category keys are
    # discovered dynamically at runtime (see
    # Api::V1::CommunityDirectoryController#community_table_names) and the
    # notify worker needs to efficiently query "which accounts want category
    # X," not just read one account's preferences.
    create_table :member_notification_category_subscriptions do |t|
      t.references :account, null: false, foreign_key: true
      t.string     :category_key, null: false

      t.timestamps
    end

    add_index :member_notification_category_subscriptions,
              %i[account_id category_key],
              unique: true,
              name: 'idx_member_notif_category_subs_unique'

    # Reverse lookup used by the notify worker's fan-out query.
    add_index :member_notification_category_subscriptions, :category_key,
              name: 'idx_member_notif_category_subs_by_category'

    # "Always notify me about this member's posts, regardless of category
    # subscriptions" — same shape as the existing CommunityMyPerson /
    # NotificationPermission join tables in this codebase.
    create_table :member_notification_targets do |t|
      t.references :account, null: false, foreign_key: true
      t.references :target_account, null: false, foreign_key: { to_table: :accounts }

      t.timestamps
    end

    add_index :member_notification_targets,
              %i[account_id target_account_id],
              unique: true,
              name: 'idx_member_notif_targets_unique'

    # Reverse lookup: "who has targeted this account" — used by the notify
    # worker's fan-out query.
    add_index :member_notification_targets, :target_account_id,
              name: 'idx_member_notif_targets_by_target'

    # Per-entry "notify me if this gets a response" subscription. Polymorphic
    # so it isn't a dead end if scope grows beyond Listings later, but only
    # Listings creates rows here for now.
    create_table :community_entry_watches do |t|
      t.references :account, null: false, foreign_key: true
      t.references :watchable, polymorphic: true, null: false

      t.timestamps
    end

    add_index :community_entry_watches,
              %i[account_id watchable_type watchable_id],
              unique: true,
              name: 'idx_community_entry_watches_unique'

    # The notification/inbox row itself — generalizes CommunityVisitNotification's
    # proven shape (read_at/emailed_at/browser_pushed_at) to any Community
    # Directory entry across any category, instead of just visits.
    create_table :community_entry_notifications do |t|
      t.references :recipient_account, null: false, foreign_key: { to_table: :accounts }
      t.references :sender_account, null: true, foreign_key: { to_table: :accounts }
      t.references :notifiable, polymorphic: true, null: false

      t.string  :category_key, null: false
      # 0=new_entry 1=entry_response
      t.integer :kind, null: false

      t.datetime :read_at
      t.datetime :emailed_at
      t.datetime :browser_pushed_at

      t.timestamps
    end

    # Inbox query: all notifications for a recipient, newest first
    add_index :community_entry_notifications,
              %i[recipient_account_id created_at],
              name: 'idx_community_entry_notifs_inbox'

    # Unread count: recipient + read_at IS NULL
    add_index :community_entry_notifications,
              %i[recipient_account_id read_at],
              name: 'idx_community_entry_notifs_unread'

    # Scheduler flush query: rows still needing push/email delivery
    add_index :community_entry_notifications, :browser_pushed_at,
              name: 'idx_community_entry_notifs_needs_push'
    add_index :community_entry_notifications, :emailed_at,
              name: 'idx_community_entry_notifs_needs_email'
  end
end
