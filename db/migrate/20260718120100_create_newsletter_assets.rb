# frozen_string_literal: true

class CreateNewsletterAssets < ActiveRecord::Migration[7.2]
  def change
    create_table :newsletter_assets do |t|
      t.references :community_newsletter, null: false, foreign_key: true, index: true
      t.string  :role,          null: false, default: ''
      t.string  :position,      null: false, default: ''
      t.integer :display_order, null: false, default: 0
      t.string  :alt_text
      t.timestamps
    end

    add_index :newsletter_assets, [:community_newsletter_id, :role]
  end
end
