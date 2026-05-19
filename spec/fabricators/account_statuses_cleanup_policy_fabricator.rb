# frozen_string_literal: true

# == Schema Information
#
# Table name: account_statuses_cleanup_policies
#
#  id                 :bigint           not null, primary key
#  enabled            :boolean          default(TRUE), not null
#  keep_direct        :boolean          default(TRUE), not null
#  keep_media         :boolean          default(FALSE), not null
#  keep_pinned        :boolean          default(TRUE), not null
#  keep_polls         :boolean          default(FALSE), not null
#  keep_self_bookmark :boolean          default(TRUE), not null
#  keep_self_fav      :boolean          default(TRUE), not null
#  min_favs           :integer
#  min_reblogs        :integer
#  min_status_age     :integer          default(1209600), not null
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  account_id         :bigint           not null
#
# Indexes
#
#  index_account_statuses_cleanup_policies_on_account_id  (account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:account_statuses_cleanup_policy) do
  account { Fabricate.build(:account) }
end
