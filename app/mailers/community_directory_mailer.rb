class CommunityDirectoryMailer < ApplicationMailer
  def entry_submitted(entry, category_key)
    @entry        = entry
    @category_key = category_key
    @submitter    = entry.account.username
    @submitted_at = entry.created_at.strftime('%B %-d, %Y at %H:%M UTC')

    admin_email = Setting.site_contact_email.presence
    return unless admin_email.present?

    mail(
      to:      admin_email,
      subject: "Community Directory: New #{category_key.titleize} entry pending review"
    )
  end

  def moderation_digest(pending_by_category, recipient_email)
    @pending_by_category = pending_by_category
    @total = pending_by_category.sum { |g| g[:entries].length }

    mail(
      to:      recipient_email,
      subject: "Community Directory: #{@total} #{@total == 1 ? 'entry' : 'entries'} awaiting review"
    )
  end

  def entry_approved(entry, category_key)
    @entry        = entry
    @category_key = category_key
    @submitter    = entry.account.username

    user = User.find_by(account: entry.account)
    return unless user&.email.present?

    mail(
      to:      user.email,
      subject: "Your #{category_key.titleize} directory listing has been approved!"
    )
  end
end
