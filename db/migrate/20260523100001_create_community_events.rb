class CreateCommunityEvents < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def change
    create_table :community_events do |t|
      t.references :account, null: false, foreign_key: true
      t.jsonb :category, default: [], null: false
      t.string :event_name, null: false
      t.text :event_description
      t.datetime :event_date, null: false
      t.string :location_town_city, null: false
      t.string :contact_info_1, null: false
      t.string :contact_info_2
      t.string :website
      t.integer :telephone
      t.integer :status, default: 0, null: false
      t.timestamps
    end

    add_index :community_events, :category, using: :gin
    add_index :community_events, :event_date
    add_index :community_events, :location_town_city
    add_index :community_events, :status, algorithm: :concurrently
    add_index :community_events, :created_at
  end
end
