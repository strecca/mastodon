# frozen_string_literal: true

# == Schema Information
#
# Table name: fasp_follow_recommendations
#
#  id                     :bigint           not null, primary key
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  recommended_account_id :bigint           not null
#  requesting_account_id  :bigint           not null
#
# Indexes
#
#  index_fasp_follow_recommendations_on_recommended_account_id  (recommended_account_id)
#  index_fasp_follow_recommendations_on_requesting_account_id   (requesting_account_id)
#
# Foreign Keys
#
#  fk_rails_...  (recommended_account_id => accounts.id)
#  fk_rails_...  (requesting_account_id => accounts.id)
#
Fabricator(:fasp_follow_recommendation, from: 'Fasp::FollowRecommendation') do
  requesting_account { Fabricate.build(:account) }
  recommended_account { Fabricate.build(:account, domain: 'fedi.example.com') }
end
