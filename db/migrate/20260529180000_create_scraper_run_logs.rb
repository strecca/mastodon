class CreateScraperRunLogs < ActiveRecord::Migration[7.2]
  def change
    create_table :scraper_run_logs do |t|
      t.string   :source_name,   null: false
      t.datetime :ran_at,        null: false
      t.integer  :fetched,       null: false, default: 0
      t.integer  :imported,      null: false, default: 0
      t.integer  :skipped,       null: false, default: 0
      t.integer  :errors,        null: false, default: 0
      t.string   :status,        null: false, default: 'ok'
      t.text     :error_message
      t.timestamps
    end

    add_index :scraper_run_logs, [:source_name, :ran_at]
  end
end
