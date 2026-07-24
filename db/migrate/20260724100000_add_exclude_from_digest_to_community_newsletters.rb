# frozen_string_literal: true

class AddExcludeFromDigestToCommunityNewsletters < ActiveRecord::Migration[7.2]
  def change
    add_column :community_newsletters, :exclude_from_digest, :boolean, default: false, null: false
  end
end
