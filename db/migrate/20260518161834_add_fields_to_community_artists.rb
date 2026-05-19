class AddFieldsToCommunityArtists < ActiveRecord::Migration[7.2]
  def change
    add_column :community_artists, :artist_description, :text, null: true
  end
end
