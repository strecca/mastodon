# frozen_string_literal: true

class CreateCommunityVisitNotifications < ActiveRecord::Migration[7.2]
  def change
    create_table :community_visit_notifications do |t|
      # Who receives this notification
      t.references :recipient_account, null: false,
                   foreign_key: { to_table: :accounts }

      # Who triggered it — null for system-generated (e.g. overlap detection)
      t.references :sender_account, null: true,
                   foreign_key: { to_table: :accounts }

      # Which visit this is about — null for non-visit notifications (e.g. new member)
      t.references :community_visit, null: true, foreign_key: true

      # 0=overlap_detected 1=friend_ping 2=visit_updated 3=new_member_joined
      t.integer :kind, null: false

      # Optional personal message (friend_ping only)
      t.text :message

      t.datetime :read_at
      t.datetime :emailed_at
      t.datetime :browser_pushed_at

      t.timestamps
    end

    # Inbox query: all notifications for a recipient, newest first
    add_index :community_visit_notifications,
              %i[recipient_account_id created_at],
              name: 'idx_community_visit_notifs_inbox'

    # Unread count: recipient + read_at IS NULL
    add_index :community_visit_notifications,
              %i[recipient_account_id read_at],
              name: 'idx_community_visit_notifs_unread'

    # Look up all notifications about a specific visit (for deletion cascades)
    add_index :community_visit_notifications, :community_visit_id,
              name: 'idx_community_visit_notifs_visit'
  end
end
