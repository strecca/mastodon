class CreateCommunityArtists < ActiveRecord::Migration[7.2]
  def change
    create_table :community_artists do |t|
      t.references :account, null: false, foreign_key: true
      t.jsonb :category, default: [], null: false
      t.string :location_town_city, null: false
      t.string :first_name, null: false
      t.string :last_name, null: false
      t.string :hours_schedule
      t.string :contact_info_1, null: false
      t.string :contact_info_2
      t.string :website
      t.integer :telephone
      t.timestamps
    end

    add_index :community_artists, :category, using: :gin
    add_index :community_artists, :location_town_city
    add_index :community_artists, :last_name
    add_index :community_artists, :created_at
  end
end
