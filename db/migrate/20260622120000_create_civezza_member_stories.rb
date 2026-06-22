# frozen_string_literal: true

class CreateCivezzaMemberStories < ActiveRecord::Migration[7.2]
  def change
    create_table :civezza_member_stories do |t|
      t.references :account, null: false, foreign_key: true, index: { unique: true }
      t.text :about_me
      t.text :civezza_story
      t.text :shaping_moment
      t.text :why_i_joined
      t.integer :image_media_ids, array: true, default: []
      t.boolean :published, null: false, default: false
      t.timestamps
    end
  end
end
