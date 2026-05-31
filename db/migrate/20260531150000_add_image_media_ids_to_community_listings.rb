class AddImageMediaIdsToCommunityListings < ActiveRecord::Migration[8.1]
  def change
    add_column :community_listings, :image_media_ids, :bigint, array: true, default: []
  end
end
