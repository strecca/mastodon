# == Schema Information
#
# Table name: community_directory_category_settings
#
#  id                      :bigint           not null, primary key
#  category_key            :string           not null
#  max_entries_per_account :integer
#  period_days             :integer
#  requires_approval       :boolean          default(TRUE), not null
#  stale_reject_after_days :integer
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#
# Indexes
#
#  index_community_directory_category_settings_on_category_key  (category_key) UNIQUE
#
class CommunityDirectoryCategorySetting < ApplicationRecord
  validates :category_key, presence: true, uniqueness: true
  validates :max_entries_per_account, numericality: { greater_than: 0, allow_nil: true }
  validates :period_days,             numericality: { greater_than: 0, allow_nil: true }
  validates :stale_reject_after_days, numericality: { greater_than: 0, allow_nil: true }
end
