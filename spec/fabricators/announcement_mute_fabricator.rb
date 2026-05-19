# frozen_string_literal: true

# == Schema Information
#
# Table name: announcement_mutes
#
#  id              :bigint           not null, primary key
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  account_id      :bigint           not null
#  announcement_id :bigint           not null
#
# Indexes
#
#  index_announcement_mutes_on_account_id_and_announcement_id  (account_id,announcement_id) UNIQUE
#  index_announcement_mutes_on_announcement_id                 (announcement_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (announcement_id => announcements.id) ON DELETE => cascade
#
Fabricator(:announcement_mute) do
  announcement { Fabricate.build(:announcement) }
  account { Fabricate.build(:account) }
end
