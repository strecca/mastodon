# frozen_string_literal: true

# Fired 2 hours after registration. Reads email content from SiteContent at
# send time so the admin can update the welcome message without a code deploy.

class WelcomeEmailWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'mailers', retry: 3

  def perform(user_id)
    user = User.find_by(id: user_id)
    return unless user

    WelcomeMailer.welcome(user).deliver_now
  end
end
