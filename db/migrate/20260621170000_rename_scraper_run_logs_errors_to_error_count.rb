class RenameScraperRunLogsErrorsToErrorCount < ActiveRecord::Migration[7.2]
  def change
    rename_column :scraper_run_logs, :errors, :error_count
  end
end
