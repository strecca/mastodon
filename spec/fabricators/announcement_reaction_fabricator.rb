# frozen_string_literal: true

# == Schema Information
#
# Table name: announcement_reactions
#
#  id              :bigint           not null, primary key
#  name            :string           default(""), not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  account_id      :bigint           not null
#  announcement_id :bigint           not null
#  custom_emoji_id :bigint
#
# Indexes
#
#  index_announcement_reactions_on_account_id_and_announcement_id  (account_id,announcement_id,name) UNIQUE
#  index_announcement_reactions_on_announcement_id                 (announcement_id)
#  index_announcement_reactions_on_custom_emoji_id                 (custom_emoji_id) WHERE (custom_emoji_id IS NOT NULL)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (announcement_id => announcements.id) ON DELETE => cascade
#  fk_rails_...  (custom_emoji_id => custom_emojis.id) ON DELETE => cascade
#
Fabricator(:announcement_reaction) do
  account { Fabricate.build(:account) }
  announcement { Fabricate.build(:announcement) }
  name { Fabricate(:custom_emoji).shortcode }
end
