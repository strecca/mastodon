# frozen_string_literal: true

# == Schema Information
#
# Table name: bookmarks
#
#  id         :bigint           not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#  status_id  :bigint           not null
#
# Indexes
#
#  index_bookmarks_on_account_id_and_status_id  (account_id,status_id) UNIQUE
#  index_bookmarks_on_status_id                 (status_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (status_id => statuses.id) ON DELETE => cascade
#
Fabricator(:bookmark) do
  account { Fabricate.build(:account) }
  status { Fabricate.build(:status) }
end
