# frozen_string_literal: true

# One-time email sent to every other confirmed member when a new member
# signs up. All content is read from SiteContent at send time — the admin
# edits it at /admin/site_settings/edit under "New Member Announcement"
# without any code deploy.

class NewMemberAnnouncementMailer < ApplicationMailer
  def announce(recipient, new_account, other_usernames)
    @recipient      = recipient
    @new_account    = new_account
    @new_username   = new_account.username
    @new_account_url = web_url("@#{new_account.pretty_acct}")
    @member_usernames = other_usernames
    @member_stories_url = web_url('member_stories')
    locale = recipient.locale.presence || 'en'

    @subject  = SiteContent.for('new_member_announcement_subject', locale: locale,
                                fallback: 'A new member has joined MiaCivezza.com!')
    @intro    = SiteContent.for('new_member_announcement_intro', locale: locale,
                                fallback: '%{username} just joined our community — say hello!')
                            .gsub('%{username}', "@#{@new_username}")
    @reminder = SiteContent.for('new_member_announcement_reminder', locale: locale,
                                fallback: "As a Reminder if you have not filled out your Member Profile with a personal image or avatar & a background image please consider doing it after reading this email. And then drop by \"Member Stories\" and take the time to tell us all a story about yourself, too. If you've already completed these steps, Thank You for helping making our Community even more connected and personal!")

    mail(to: recipient.email, subject: @subject)
  end
end
