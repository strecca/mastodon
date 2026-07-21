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

  def rails_exception(exception, context = {})
    @exception_class = exception.class.name
    @error           = exception.message
    @backtrace       = Array(exception.backtrace).first(8).join("\n")
    @context         = context.presence&.inspect || 'none'
    @occurred_at     = Time.current.strftime('%Y-%m-%d %H:%M UTC')

    notify_address = ENV.fetch('CONTACT_NOTIFY_EMAIL') { User.admins.first&.email }
    return unless notify_address.present?

    mail(
      to:      notify_address,
      subject: "[miacivezza alert] #{@exception_class}: #{@error.to_s.truncate(80)}"
    )
  end

  def backup_failed(reason)
    @reason      = reason
    @occurred_at = Time.current.strftime('%Y-%m-%d %H:%M UTC')

    notify_address = ENV.fetch('CONTACT_NOTIFY_EMAIL') { User.admins.first&.email }
    return unless notify_address.present?

    mail(
      to:      notify_address,
      subject: '[miacivezza alert] Nightly database backup failed'
    )
  end
end
