# frozen_string_literal: true

# == Schema Information
#
# Table name: login_activities
#
#  id                    :bigint           not null, primary key
#  authentication_method :string
#  failure_reason        :string
#  ip                    :inet
#  provider              :string
#  success               :boolean
#  user_agent            :string
#  created_at            :datetime
#  user_id               :bigint           not null
#
# Indexes
#
#  index_login_activities_on_user_id  (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
Fabricator(:login_activity) do
  user { Fabricate.build(:user) }
  authentication_method 'password'
  success               true
  failure_reason        nil
  ip                    { Faker::Internet.ip_v4_address }
  user_agent            { Faker::Internet.user_agent }
end
