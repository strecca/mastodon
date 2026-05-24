# == Schema Information
#
# Table name: community_directory_permissions
#
#  id           :bigint           not null, primary key
#  category_key :string
#  is_steward   :boolean          default(FALSE), not null
#  notes        :text
#  trusted      :boolean          default(FALSE), not null
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  account_id   :bigint           not null
#
# Indexes
#
#  idx_cd_permissions_account_category  (account_id,category_key) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#
class CommunityDirectoryPermission < ApplicationRecord
  belongs_to :account

  validates :account_id, uniqueness: { scope: :category_key }
  validates :trusted, inclusion: { in: [true, false] }
  validates :is_steward, inclusion: { in: [true, false] }
end
