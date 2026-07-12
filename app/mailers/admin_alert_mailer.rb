# frozen_string_literal: true

class AdminAlertMailer < ApplicationMailer
  def job_died(job, exception)
    @worker    = job['class']
    @args      = job['args'].inspect
    @error     = exception.message
    @backtrace = Array(exception.backtrace).first(5).join("\n")
    @failed_at = Time.current.strftime('%Y-%m-%d %H:%M UTC')

    notify_address = ENV.fetch('CONTACT_NOTIFY_EMAIL') { User.admins.first&.email }
    return unless notify_address.present?

    mail(
      to:      notify_address,
      subject: "[miacivezza alert] #{@worker} job exhausted retries"
    )
  end
end
