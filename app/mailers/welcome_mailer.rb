# frozen_string_literal: true

# Community welcome email sent 2 hours after registration.
# All content is read from SiteContent at send time — the admin edits it
# at /admin/site_settings/edit under "Welcome Email" without any code deploy.

class WelcomeMailer < ApplicationMailer
  def welcome(user)
    @user     = user
    @account  = user.account
    @username = @account.username
    locale    = user.locale.presence || 'en'

    @subject   = SiteContent.for('welcome_email_subject',   locale: locale,
                                 fallback: 'Welcome to MiaCivezza.com!')
    @body      = SiteContent.for('welcome_email_body',      locale: locale,
                                 fallback: "We're glad you're here. Explore the community directory, share your story, and connect with neighbours in Civezza and along the Ligurian coast.")
    @cta_label = SiteContent.for('welcome_email_cta_label', locale: locale,
                                 fallback: 'Explore the Community')
    @cta_url   = root_url

    mail(to: user.email, subject: @subject)
  end
end
