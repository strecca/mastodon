class CreateCommunityListings < ActiveRecord::Migration[7.2]
  def change
    create_table :community_listings do |t|
      t.references :account, null: false, foreign_key: true
      t.integer    :listing_type,   null: false, default: 0
      t.string     :title,          null: false
      t.text       :description
      t.jsonb      :category,       null: false, default: []
      t.integer    :condition_value
      t.decimal    :price,          precision: 10, scale: 2
      t.string     :currency,       default: 'EUR'
      t.string     :rental_period
      t.text       :trade_for
      t.string     :location,       default: 'Civezza'
      t.integer    :status,         null: false, default: 0
      t.timestamps
    end

    add_index :community_listings, :listing_type
    add_index :community_listings, :status
    add_index :community_listings, :category, using: :gin
    add_index :community_listings, [:account_id, :status]
  end
end
