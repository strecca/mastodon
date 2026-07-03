class CreateSiteContents < ActiveRecord::Migration[8.1]
  def change
    create_table :site_contents do |t|
      t.string :key,          null: false
      t.string :locale,       null: false, default: 'en'
      t.text   :value,        null: false, default: ''
      t.string :content_type, null: false, default: 'text'
      t.timestamps
    end

    add_index :site_contents, [:key, :locale], unique: true
  end
end
