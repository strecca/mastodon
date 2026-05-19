class CreateCommunityDirectoryCategorySettings < ActiveRecord::Migration[7.2]
  def change
    create_table :community_directory_category_settings do |t|
      t.string :category_key, null: false
      t.boolean :requires_approval, default: true, null: false
      t.integer :max_entries_per_account
      t.integer :period_days
      t.timestamps
    end

    add_index :community_directory_category_settings, :category_key, unique: true
  end
end
