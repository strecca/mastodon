# frozen_string_literal: true

class CreateCommunityEntryTranslations < ActiveRecord::Migration[7.2]
  def change
    create_table :community_entry_translations do |t|
      t.references :translatable, polymorphic: true, null: false
      t.string  :locale,          null: false
      t.string  :field_name,      null: false
      t.text    :translated_text, null: false
      t.string  :source_digest,   null: false
      t.timestamps
    end

    add_index :community_entry_translations,
      %i[translatable_type translatable_id locale field_name],
      unique: true,
      name: 'idx_community_translations_unique'

    add_index :community_entry_translations,
      %i[translatable_type translatable_id locale],
      name: 'idx_community_translations_by_entry_locale'
  end
end
