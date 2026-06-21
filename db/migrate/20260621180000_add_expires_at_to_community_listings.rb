class AddExpiresAtToCommunityListings < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def up
    add_column :community_listings, :expires_at, :datetime
    add_index  :community_listings, :expires_at, algorithm: :concurrently

    # Backfill existing open listings: expire 60 days after creation
    safety_assured do
      execute <<~SQL
        UPDATE community_listings
        SET expires_at = created_at + INTERVAL '60 days'
        WHERE status = 0 AND expires_at IS NULL
      SQL
    end
  end

  def down
    remove_column :community_listings, :expires_at
  end
end
