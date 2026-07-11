# frozen_string_literal: true

class ContactMessageMailer < ApplicationMailer
  def contact(sender_name:, sender_email:, subject:, message:, is_member:, username: nil)
    @sender_name  = sender_name
    @sender_email = sender_email
    @subject      = subject
    @message      = message
    @is_member    = is_member
    @username     = username

    notify_address = ENV.fetch('CONTACT_NOTIFY_EMAIL') { User.admins.first&.email }

    mail(
      to:       notify_address,
      reply_to: sender_email,
      subject:  "[miacivezza contact] #{subject}"
    )
  end
end
