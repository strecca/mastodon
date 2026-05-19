class CreateCommunityDirectoryPermissions < ActiveRecord::Migration[7.2]
  def change
    create_table :community_directory_permissions do |t|
      t.references :account, null: false, foreign_key: true
      t.string :category_key  # null = global across all categories
      t.boolean :trusted, default: false, null: false
      t.boolean :is_steward, default: false, null: false
      t.text :notes
      t.timestamps
    end

    add_index :community_directory_permissions, [:account_id, :category_key],
              unique: true, name: 'idx_cd_permissions_account_category'
  end
end
