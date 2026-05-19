# frozen_string_literal: true

# == Schema Information
#
# Table name: favourites
#
#  id         :bigint           not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#  status_id  :bigint           not null
#
# Indexes
#
#  index_favourites_on_account_id_and_id         (account_id,id)
#  index_favourites_on_account_id_and_status_id  (account_id,status_id) UNIQUE
#  index_favourites_on_status_id                 (status_id)
#
# Foreign Keys
#
#  fk_5eb6c2b873  (account_id => accounts.id) ON DELETE => cascade
#  fk_b0e856845e  (status_id => statuses.id) ON DELETE => cascade
#
Fabricator(:favourite) do
  account { Fabricate.build(:account) }
  status { Fabricate.build(:status) }
end
