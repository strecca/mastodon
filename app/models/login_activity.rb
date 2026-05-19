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

class LoginActivity < ApplicationRecord
  include BrowserDetection

  enum :authentication_method, { password: 'password', otp: 'otp', webauthn: 'webauthn', sign_in_token: 'sign_in_token', omniauth: 'omniauth' }

  belongs_to :user

  validates :authentication_method, inclusion: { in: authentication_methods.keys }
end
