# frozen_string_literal: true

class CreateCommunityServices < ActiveRecord::Migration[7.2]
  def up
    create_table :community_services do |t|
      t.references :account, null: false, foreign_key: true
      t.string  :name,             null: false
      t.jsonb   :category,         default: [], null: false
      t.string  :town,             null: false
      t.text    :description,      null: false
      t.string  :phone
      t.string  :email
      t.string  :website
      t.string  :business_hours
      t.string  :price_range
      t.jsonb   :languages_spoken, default: []
      t.column  :image_media_ids,  :bigint, array: true, default: []
      t.integer :status,           default: 0, null: false
      t.timestamps
    end

    add_index :community_services, :status
    add_index :community_services, :category,         using: :gin
    add_index :community_services, :languages_spoken, using: :gin

    safety_assured do
      execute "CREATE INDEX idx_community_services_search_trgm ON community_services USING gin (lower(coalesce(name,'') || ' ' || coalesce(description,'')) gin_trgm_ops) WHERE status = 1;"
      execute "CREATE INDEX idx_community_services_approved_newest  ON community_services (created_at DESC) WHERE status = 1;"
      execute "CREATE INDEX idx_community_services_approved_oldest  ON community_services (created_at ASC)  WHERE status = 1;"
      execute "CREATE INDEX idx_community_services_approved_az      ON community_services (name ASC)        WHERE status = 1;"
      execute "CREATE INDEX idx_community_services_approved_updated ON community_services (updated_at DESC)  WHERE status = 1;"
    end
  end

  def down
    drop_table :community_services
  end
end
