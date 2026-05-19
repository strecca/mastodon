class AddStatusToCommunityArtists < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def change
    add_column :community_artists, :status, :integer, default: 0, null: false
    add_index  :community_artists, :status, algorithm: :concurrently
  end
end
