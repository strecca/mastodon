# frozen_string_literal: true

class CreateCommunityRestaurants < ActiveRecord::Migration[7.2]
  def up
    create_table :community_restaurants do |t|
      t.references :account, null: false, foreign_key: true
      t.string  :name,          null: false
      t.jsonb   :cuisine_type,  default: [], null: false
      t.string  :town,          null: false
      t.text    :description
      t.string  :phone
      t.string  :website
      t.string  :price_range
      t.string  :opening_hours
      t.jsonb   :features,      default: []
      t.column  :image_media_ids, :bigint, array: true, default: []
      t.integer :status,        default: 0, null: false
      t.timestamps
    end

    add_index :community_restaurants, :status
    add_index :community_restaurants, :cuisine_type, using: :gin
    add_index :community_restaurants, :features,     using: :gin

    safety_assured do
      execute "CREATE INDEX idx_community_restaurants_search_trgm ON community_restaurants USING gin (lower(coalesce(name,'') || ' ' || coalesce(description,'')) gin_trgm_ops) WHERE status = 1;"
      execute "CREATE INDEX idx_community_restaurants_approved_newest  ON community_restaurants (created_at DESC) WHERE status = 1;"
      execute "CREATE INDEX idx_community_restaurants_approved_oldest  ON community_restaurants (created_at ASC)  WHERE status = 1;"
      execute "CREATE INDEX idx_community_restaurants_approved_az      ON community_restaurants (name ASC)        WHERE status = 1;"
      execute "CREATE INDEX idx_community_restaurants_approved_updated ON community_restaurants (updated_at DESC)  WHERE status = 1;"
    end
  end

  def down
    drop_table :community_restaurants
  end
end
