# frozen_string_literal: true

class AddImportFieldsToCommunityEvents < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def change
    add_column :community_events, :end_date,      :datetime
    add_column :community_events, :source_url,    :string
    add_column :community_events, :source_name,   :string
    add_column :community_events, :auto_imported, :boolean, default: false, null: false

    # contact_info_1 is not meaningful for scraped events
    change_column_null :community_events, :contact_info_1, true

    add_index :community_events, :source_url, unique: true, where: 'source_url IS NOT NULL', algorithm: :concurrently
    add_index :community_events, :auto_imported, algorithm: :concurrently
    add_index :community_events, :end_date, algorithm: :concurrently
  end
end
