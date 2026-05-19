# frozen_string_literal: true

# == Schema Information
#
# Table name: follow_recommendation_mutes
#
#  id                :bigint           not null, primary key
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint           not null
#  target_account_id :bigint           not null
#
# Indexes
#
#  idx_on_account_id_target_account_id_a8c8ddf44e          (account_id,target_account_id) UNIQUE
#  index_follow_recommendation_mutes_on_target_account_id  (target_account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (target_account_id => accounts.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe FollowRecommendationMute do
  describe 'Associations' do
    it { is_expected.to belong_to(:account) }
    it { is_expected.to belong_to(:target_account).class_name('Account') }
  end

  describe 'Validations' do
    subject { Fabricate.build :follow_recommendation_mute }

    it { is_expected.to validate_uniqueness_of(:target_account_id).scoped_to(:account_id) }
  end

  describe 'Callbacks' do
    describe 'Maintaining the recommendation cache' do
      let(:account) { Fabricate :account }
      let(:cache_key) { "follow_recommendations/#{account.id}" }

      before { Rails.cache.write(cache_key, 123) }

      it 'purges on save' do
        expect { Fabricate :follow_recommendation_mute, account: account }
          .to(change { Rails.cache.exist?(cache_key) }.from(true).to(false))
      end
    end
  end
end
