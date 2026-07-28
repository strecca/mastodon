# frozen_string_literal: true

class RemoveEmailSubscriptionsDuplicateIndex < ActiveRecord::Migration[8.1]
  def change
    # Guarded: on this fork's production database, email_subscriptions was
    # created via an out-of-band migration run at some point, and never had
    # a plain :account_id index in the first place (only the composite
    # index_email_subscriptions_on_account_id_and_email survived) -- an
    # unconditional remove_index aborts the whole migration run here.
    remove_index :email_subscriptions, :account_id if index_exists?(:email_subscriptions, :account_id)
  end
end
