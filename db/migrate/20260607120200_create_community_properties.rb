# frozen_string_literal: true

class CreateCommunityProperties < ActiveRecord::Migration[7.2]
  def up
    create_table :community_properties do |t|
      t.references :account, null: false, foreign_key: true
      t.string  :title,         null: false
      t.string  :listing_type,  null: false
      t.string  :property_type, null: false
      t.string  :town,          null: false
      t.text    :description,   null: false
      t.string  :price
      t.string  :price_period
      t.date    :available_from
      t.string  :bedrooms
      t.string  :bathrooms
      t.integer :size_sqm
      t.string  :floor
      t.string  :furnished
      t.string  :condition
      t.jsonb   :features,      default: []
      t.string  :phone
      t.string  :email
      t.string  :agency_name
      t.column  :image_media_ids, :bigint, array: true, default: []
      t.integer :status,        default: 0, null: false
      t.timestamps
    end

    add_index :community_properties, :status
    add_index :community_properties, :features, using: :gin

    safety_assured do
      execute "CREATE INDEX idx_community_properties_search_trgm ON community_properties USING gin (lower(coalesce(title,'') || ' ' || coalesce(description,'')) gin_trgm_ops) WHERE status = 1;"
      execute "CREATE INDEX idx_community_properties_approved_newest  ON community_properties (created_at DESC) WHERE status = 1;"
      execute "CREATE INDEX idx_community_properties_approved_oldest  ON community_properties (created_at ASC)  WHERE status = 1;"
      execute "CREATE INDEX idx_community_properties_approved_az      ON community_properties (title ASC)       WHERE status = 1;"
      execute "CREATE INDEX idx_community_properties_approved_updated ON community_properties (updated_at DESC)  WHERE status = 1;"
    end
  end

  def down
    drop_table :community_properties
  end
end
