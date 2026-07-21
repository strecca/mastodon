# frozen_string_literal: true

class Api::V1::ContactMessagesController < Api::BaseController
  skip_before_action :require_authenticated_user!

  RATE_LIMIT_WINDOW = 1.hour
  RATE_LIMIT_MAX    = 3

  MIN_SUBMIT_SECONDS = 2

  def create
    # Honeypot: real users never see or fill this field. Bots that blindly
    # fill every input do. Pretend success so they don't retry/adapt.
    return render json: { success: true } if params[:website].present?

    # Bots also tend to submit near-instantly after the page loads.
    rendered_at = params[:form_rendered_at].to_i
    if rendered_at.positive? && (Time.now.to_i - rendered_at) < MIN_SUBMIT_SECONDS
      return render json: { success: true }
    end

    subject = params[:subject].to_s.strip
    message = params[:message].to_s.strip

    if user_signed_in?
      sender_name  = current_account.display_name.presence || current_account.username
      sender_email = current_user.email
      username     = current_account.username
      is_member    = true
    else
      sender_name  = params[:name].to_s.strip
      sender_email = params[:email].to_s.strip
      username     = nil
      is_member    = false

      return render json: { error: 'Email is required.' }, status: :unprocessable_entity if sender_email.blank?
      return render json: { error: 'Invalid email address.' }, status: :unprocessable_entity unless sender_email.match?(URI::MailTo::EMAIL_REGEXP)
    end

    return render json: { error: 'Missing required fields.' }, status: :unprocessable_entity if
      sender_name.blank? || subject.blank? || message.blank?

    ContactMessageMailer.contact(
      sender_name:  sender_name,
      sender_email: sender_email,
      subject:      subject,
      message:      message,
      is_member:    is_member,
      username:     username
    ).deliver_later

    render json: { success: true }
  end
end
