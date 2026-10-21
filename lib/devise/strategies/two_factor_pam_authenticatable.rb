# frozen_string_literal: true

require 'devise/strategies/base'

module Devise
  module Strategies
    class TwoFactorPamAuthenticatable < Base
      def valid?
        valid_params? && mapping.to.respond_to?(:authenticate_with_pam)
      end

      def authenticate!
        resource = mapping.to.authenticate_with_pam(params[scope])

        raise(:invalid) unless resource && !resource.otp_required_for_login?

        success!(resource)

        # -- method is from Warden::Strategies::Base
      end

      protected

      def valid_params?
        params[scope].is_a?(Hash) && params[scope][:password].present?
      end
    end
  end
end

Warden::Strategies.add(:two_factor_pam_authenticatable, Devise::Strategies::TwoFactorPamAuthenticatable)
