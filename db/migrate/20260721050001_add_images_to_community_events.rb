# frozen_string_literal: true

class AddImagesToCommunityEvents < ActiveRecord::Migration[7.2]
  def change
    add_column :community_events, :image_media_ids, :bigint, array: true, default: []
  end
end
