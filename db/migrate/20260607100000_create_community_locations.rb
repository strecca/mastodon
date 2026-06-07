# frozen_string_literal: true

class CreateCommunityLocations < ActiveRecord::Migration[7.2]
  def change
    create_table :community_locations do |t|
      t.string  :name,       null: false
      t.boolean :active,     null: false, default: true
      t.integer :sort_order, null: false, default: 0
      t.timestamps
    end

    add_index :community_locations, :active
    add_index :community_locations, :sort_order
    add_index :community_locations, :name, unique: true
  end
end
