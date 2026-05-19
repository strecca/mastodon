# frozen_string_literal: true

# Runs once daily. If any entries have been pending for more than 24 hours,
# sends a digest email to the site admin and to any per-category stewards.
# Exits in one SQL query if there is nothing to do.

class Scheduler::CommunityModerationReminderScheduler
  include Sidekiq::Worker

  sidekiq_options retry: 0, lock: :until_executed, lock_ttl: 1.day.to_i, queue: 'scheduler'

  PENDING_THRESHOLD = 24.hours

  def perform
    # Fast exit — one count query, no email work if queue is clear
    return if old_pending_count.zero?

    pending_by_category = collect_pending

    admin_email = Setting.site_contact_email.presence
    if admin_email.present?
      CommunityDirectoryMailer.moderation_digest(pending_by_category, admin_email).deliver_later
    end

    notify_stewards(pending_by_category)
  end

  private

  def old_pending_count
    community_table_names.sum do |key|
      model = model_for(key)
      next 0 unless model && model.column_names.include?('status')
      model.where(status: :pending).where('created_at < ?', PENDING_THRESHOLD.ago).count
    end
  end

  def collect_pending
    community_table_names.filter_map do |key|
      model = model_for(key)
      next unless model && model.column_names.include?('status')

      entries = model.where(status: :pending)
                     .where('created_at < ?', PENDING_THRESHOLD.ago)
                     .includes(:account)
      next if entries.empty?

      config = load_config(key)

      { category_key: key,
        category_display_name: config&.dig('display_name') || key.titleize,
        entries: entries.map { |e|
          { submitter:    e.account.username,
            submitted_at: e.created_at.strftime('%b %-d, %Y %H:%M UTC') }
        } }
    end
  end

  def notify_stewards(pending_by_category)
    steward_map = CommunityDirectoryPermission
      .where(is_steward: true)
      .where.not(category_key: nil)
      .includes(:account)
      .group_by(&:category_key)

    steward_map.each do |category_key, stewards|
      category_data = pending_by_category.select { |g| g[:category_key] == category_key }
      next if category_data.empty?

      stewards.each do |perm|
        user = User.find_by(account: perm.account)
        next unless user&.email.present?
        CommunityDirectoryMailer.moderation_digest(category_data, user.email).deliver_later
      end
    end
  end

  def community_table_names
    excluded = %w[community_directory community_directory_permissions community_directory_category_settings]
    ActiveRecord::Base.connection.tables
      .select { |t| t.start_with?('community_') && excluded.exclude?(t) }
      .map { |t| t.delete_prefix('community_') }
  end

  def model_for(category_key)
    "Community#{category_key.camelize}".constantize
  rescue NameError
    nil
  end

  def load_config(category_key)
    path = Rails.root.join('app', 'javascript', 'flavours', 'glitch', 'features',
                           "community_#{category_key}", 'config.json')
    File.exist?(path) ? JSON.parse(File.read(path)) : nil
  end
end
