# frozen_string_literal: true

# == Schema Information
#
# Table name: mentions
#
#  id         :bigint           not null, primary key
#  silent     :boolean          default(FALSE), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#  status_id  :bigint           not null
#
# Indexes
#
#  index_mentions_on_account_id_and_status_id  (account_id,status_id) UNIQUE
#  index_mentions_on_status_id                 (status_id)
#
# Foreign Keys
#
#  fk_970d43f9d1  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...   (status_id => statuses.id) ON DELETE => cascade
#
Fabricator(:mention) do
  account { Fabricate.build(:account) }
  status { Fabricate.build(:status) }
end
