# frozen_string_literal: true

# == Schema Information
#
# Table name: fasp_subscriptions
#
#  id                  :bigint           not null, primary key
#  category            :string           not null
#  max_batch_size      :integer          not null
#  subscription_type   :string           not null
#  threshold_likes     :integer
#  threshold_replies   :integer
#  threshold_shares    :integer
#  threshold_timeframe :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  fasp_provider_id    :bigint           not null
#
# Indexes
#
#  index_fasp_subscriptions_on_fasp_provider_id  (fasp_provider_id)
#
# Foreign Keys
#
#  fk_rails_...  (fasp_provider_id => fasp_providers.id)
#
Fabricator(:fasp_subscription, from: 'Fasp::Subscription') do
  category            'content'
  subscription_type   'lifecycle'
  max_batch_size      10
  fasp_provider
end
