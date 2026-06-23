# frozen_string_literal: true

class FixMemberStoriesImageMediaIdsToBigint < ActiveRecord::Migration[7.2]
  def up
    safety_assured do
      change_column :civezza_member_stories, :image_media_ids, :bigint, array: true, default: []
    end
  end

  def down
    safety_assured do
      change_column :civezza_member_stories, :image_media_ids, :integer, array: true, default: []
    end
  end
end
