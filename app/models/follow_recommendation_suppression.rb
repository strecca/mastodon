# frozen_string_literal: true

# == Schema Information
#
# Table name: follow_recommendation_suppressions
#
#  id         :bigint           not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#
# Indexes
#
#  index_follow_recommendation_suppressions_on_account_id  (account_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#

class FollowRecommendationSuppression < ApplicationRecord
  belongs_to :account
end
