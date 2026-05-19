# frozen_string_literal: true

# == Schema Information
#
# Table name: session_activations
#
#  id                       :bigint           not null, primary key
#  ip                       :inet
#  user_agent               :string           default(""), not null
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#  access_token_id          :bigint
#  session_id               :string           not null
#  user_id                  :bigint           not null
#  web_push_subscription_id :bigint
#
# Indexes
#
#  index_session_activations_on_access_token_id  (access_token_id)
#  index_session_activations_on_session_id       (session_id) UNIQUE
#  index_session_activations_on_user_id          (user_id)
#
# Foreign Keys
#
#  fk_957e5bda89  (access_token_id => oauth_access_tokens.id) ON DELETE => cascade
#  fk_e5fda67334  (user_id => users.id) ON DELETE => cascade
#

class SessionActivation < ApplicationRecord
  include BrowserDetection

  belongs_to :user, inverse_of: :session_activations
  belongs_to :access_token, class_name: 'Doorkeeper::AccessToken', dependent: :destroy, optional: true
  belongs_to :web_push_subscription, class_name: 'Web::PushSubscription', dependent: :destroy, optional: true

  delegate :token,
           to: :access_token,
           allow_nil: true

  before_create :assign_access_token

  DEFAULT_SCOPES = %w(read write follow).freeze

  scope :latest, -> { order(id: :desc) }

  class << self
    def active?(id)
      id && exists?(session_id: id)
    end

    def activate(**)
      create!(**).tap { purge_old }
    end

    def deactivate(id)
      return unless id

      where(session_id: id).destroy_all
    end

    def purge_old
      latest.offset(Rails.configuration.x.max_session_activations).destroy_all
    end

    def exclusive(id)
      where.not(session_id: id).destroy_all
    end
  end

  private

  def assign_access_token
    self.access_token = Doorkeeper::AccessToken.create!(access_token_attributes)
  end

  def access_token_attributes
    {
      application_id: Doorkeeper::Application.find_by(superapp: true)&.id,
      resource_owner_id: user_id,
      scopes: DEFAULT_SCOPES.join(' '),
      expires_in: Doorkeeper.configuration.access_token_expires_in,
      use_refresh_token: Doorkeeper.configuration.refresh_token_enabled?,
    }
  end
end
