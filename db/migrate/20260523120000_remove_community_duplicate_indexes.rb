class RemoveCommunityDuplicateIndexes < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  # Guarded with index_name_exists? throughout: on a fresh install/replay
  # from an empty database, some of these indexes never get created in the
  # first place (e.g. email_subscriptions is an upstream table whose own
  # create-table migration was later revised to a different index name),
  # so an unconditional remove_index would abort the whole migration run.
  # Already a no-op in practice on the existing production database, where
  # this migration has already run.
  def change
    remove_index :community_directory_permissions,
                 name: 'index_community_directory_permissions_on_account_id',
                 algorithm: :concurrently if index_name_exists?(:community_directory_permissions, 'index_community_directory_permissions_on_account_id')

    remove_index :community_entry_translations,
                 name: 'index_community_entry_translations_on_translatable',
                 algorithm: :concurrently if index_name_exists?(:community_entry_translations, 'index_community_entry_translations_on_translatable')

    # idx_community_translations_by_entry_locale is itself covered by the unique index
    remove_index :community_entry_translations,
                 name: 'idx_community_translations_by_entry_locale',
                 algorithm: :concurrently if index_name_exists?(:community_entry_translations, 'idx_community_translations_by_entry_locale')

    remove_index :community_notification_preferences,
                 name: 'index_community_notification_preferences_on_account_id',
                 algorithm: :concurrently if index_name_exists?(:community_notification_preferences, 'index_community_notification_preferences_on_account_id')

    remove_index :community_visit_notifications,
                 name: 'index_community_visit_notifications_on_community_visit_id',
                 algorithm: :concurrently if index_name_exists?(:community_visit_notifications, 'index_community_visit_notifications_on_community_visit_id')

    remove_index :community_visit_notifications,
                 name: 'index_community_visit_notifications_on_recipient_account_id',
                 algorithm: :concurrently if index_name_exists?(:community_visit_notifications, 'index_community_visit_notifications_on_recipient_account_id')

    remove_index :email_subscriptions,
                 name: 'index_email_subscriptions_on_account_id',
                 algorithm: :concurrently if index_name_exists?(:email_subscriptions, 'index_email_subscriptions_on_account_id')

    remove_index :visit_availabilities,
                 name: 'index_visit_availabilities_on_community_visit_id',
                 algorithm: :concurrently if index_name_exists?(:visit_availabilities, 'index_visit_availabilities_on_community_visit_id')
  end
end
