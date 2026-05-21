# frozen_string_literal: true

class CreateCommunityNotificationPreferences < ActiveRecord::Migration[7.2]
  def change
    create_table :community_notification_preferences do |t|
      t.references :account, null: false, foreign_key: true

      # 0=never 1=immediate 2=daily_digest 3=weekly_digest
      t.integer :email_frequency, null: false, default: 2

      t.boolean :browser_push,     null: false, default: false
      t.boolean :on_visit_overlap, null: false, default: true
      t.boolean :on_friend_ping,   null: false, default: true
      t.boolean :on_new_member,    null: false, default: false

      t.timestamps
    end

    # One preference row per account
    add_index :community_notification_preferences, :account_id,
              unique: true,
              name: 'idx_community_notif_prefs_account'
  end
end
