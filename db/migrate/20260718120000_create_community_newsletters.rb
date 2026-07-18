# frozen_string_literal: true

class CreateCommunityNewsletters < ActiveRecord::Migration[7.2]
  def change
    create_table :community_newsletters do |t|
      t.string   :title,               null: false, default: ''
      t.string   :author_name,         null: false, default: ''
      t.date     :published_on
      t.string   :slug,                null: false, default: ''
      t.string   :newsletter_template, null: false, default: 'two_column'
      t.string   :masthead_location
      t.string   :footer_attribution
      t.text     :left_column_it
      t.text     :left_column_en
      t.text     :right_column_it
      t.text     :right_column_en
      t.text     :source_text
      t.integer  :status,              null: false, default: 0
      t.string   :mastodon_status_id
      t.timestamps
    end

    add_index :community_newsletters, :slug,         unique: true
    add_index :community_newsletters, :published_on
    add_index :community_newsletters, :status
  end
end
