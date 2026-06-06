# frozen_string_literal: true

class AddImagesToCommunityArtists < ActiveRecord::Migration[7.2]
  def change
    add_column :community_artists, :image_media_ids, :bigint, array: true, default: []
  end
end
