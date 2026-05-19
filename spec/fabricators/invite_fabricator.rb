# frozen_string_literal: true

# == Schema Information
#
# Table name: invites
#
#  id         :bigint           not null, primary key
#  autofollow :boolean          default(FALSE), not null
#  code       :string           default(""), not null
#  comment    :text
#  expires_at :datetime
#  max_uses   :integer
#  uses       :integer          default(0), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :bigint           not null
#
# Indexes
#
#  index_invites_on_code     (code) UNIQUE
#  index_invites_on_user_id  (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
Fabricator(:invite) do
  user { Fabricate.build(:user) }
  expires_at nil
  max_uses   nil
  uses       0
end
