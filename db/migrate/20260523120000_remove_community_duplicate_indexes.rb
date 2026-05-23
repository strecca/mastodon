class RemoveCommunityDuplicateIndexes < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def change
    remove_index :community_directory_permissions,
                 name: 'index_community_directory_permissions_on_account_id',
                 algorithm: :concurrently

    remove_index :community_entry_translations,
                 name: 'index_community_entry_translations_on_translatable',
                 algorithm: :concurrently

    # idx_community_translations_by_entry_locale is itself covered by the unique index
    remove_index :community_entry_translations,
                 name: 'idx_community_translations_by_entry_locale',
                 algorithm: :concurrently

    remove_index :community_notification_preferences,
                 name: 'index_community_notification_preferences_on_account_id',
                 algorithm: :concurrently

    remove_index :community_visit_notifications,
                 name: 'index_community_visit_notifications_on_community_visit_id',
                 algorithm: :concurrently

    remove_index :community_visit_notifications,
                 name: 'index_community_visit_notifications_on_recipient_account_id',
                 algorithm: :concurrently

    remove_index :email_subscriptions,
                 name: 'index_email_subscriptions_on_account_id',
                 algorithm: :concurrently

    remove_index :visit_availabilities,
                 name: 'index_visit_availabilities_on_community_visit_id',
                 algorithm: :concurrently
  end
end
