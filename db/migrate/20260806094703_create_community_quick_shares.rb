# frozen_string_literal: true

class CreateCommunityQuickShares < ActiveRecord::Migration[7.2]
  def change
    create_table :community_quick_shares do |t|
      t.references :account,          null: false, foreign_key: true
      t.string     :slug,             null: false, default: ''
      t.text       :caption,          null: false, default: ''
      t.string     :pdf_path,         null: false, default: ''
      t.string     :mastodon_status_id
      t.timestamps
    end

    add_index :community_quick_shares, :slug, unique: true
  end
end
