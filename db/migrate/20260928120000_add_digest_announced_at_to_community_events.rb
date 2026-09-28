# frozen_string_literal: true

class AddDigestAnnouncedAtToCommunityEvents < ActiveRecord::Migration[7.2]
  def change
    add_column :community_events, :digest_announced_at, :datetime
    add_index :community_events, :digest_announced_at
  end
end
