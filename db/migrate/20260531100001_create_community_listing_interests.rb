class CreateCommunityListingInterests < ActiveRecord::Migration[7.2]
  def change
    create_table :community_listing_interests do |t|
      t.references :community_listing, null: false, foreign_key: true
      t.references :account,           null: false, foreign_key: true
      t.text       :message
      t.integer    :status, null: false, default: 0
      t.timestamps
    end

    add_index :community_listing_interests,
              [:community_listing_id, :account_id],
              unique: true,
              name: 'index_cli_on_listing_and_account'
  end
end
