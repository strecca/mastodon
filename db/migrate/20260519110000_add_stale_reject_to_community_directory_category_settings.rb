class AddStaleRejectToCommunityDirectoryCategorySettings < ActiveRecord::Migration[7.2]
  def change
    add_column :community_directory_category_settings, :stale_reject_after_days, :integer
  end
end
