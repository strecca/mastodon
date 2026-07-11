# frozen_string_literal: true

class CreateCommunityDailyDigests < ActiveRecord::Migration[7.2]
  def change
    create_table :community_daily_digests do |t|
      t.date     :digest_date,   null: false
      t.text     :content_it
      t.text     :content_en
      t.integer  :article_count, default: 0, null: false
      t.datetime :generated_at

      t.timestamps
    end

    add_index :community_daily_digests, :digest_date, unique: true
  end
end
