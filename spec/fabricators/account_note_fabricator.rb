# frozen_string_literal: true

# == Schema Information
#
# Table name: account_notes
#
#  id                :bigint           not null, primary key
#  comment           :text             not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint           not null
#  target_account_id :bigint           not null
#
# Indexes
#
#  index_account_notes_on_account_id_and_target_account_id  (account_id,target_account_id) UNIQUE
#  index_account_notes_on_target_account_id                 (target_account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (target_account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:account_note) do
  account { Fabricate.build(:account) }
  target_account { Fabricate.build(:account) }
  comment        'User note text'
end
