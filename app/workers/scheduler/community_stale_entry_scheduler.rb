# frozen_string_literal: true

# Runs once daily. Auto-rejects entries that have been pending longer than
# stale_reject_after_days (configured per category in the admin panel).
# Exits in one query if no category has this threshold configured.

class Scheduler::CommunityStaleEntryScheduler
  include Sidekiq::Worker

  sidekiq_options retry: 0, lock: :until_executed, lock_ttl: 1.day.to_i, queue: 'scheduler'

  def perform
    # Fast exit — if no category has stale rejection configured, do nothing
    active_settings = CommunityDirectoryCategorySetting.where.not(stale_reject_after_days: nil)
    return if active_settings.none?

    active_settings.each { |setting| process_category(setting) }
  end

  private

  def process_category(setting)
    model = model_for(setting.category_key)
    return unless model && model.column_names.include?('status')

    cutoff = setting.stale_reject_after_days.days.ago
    stale  = model.where(status: :pending).where('created_at < ?', cutoff)
    count  = stale.count
    return if count.zero?

    Rails.logger.info(
      "[CommunityDirectory] Auto-rejecting #{count} stale #{setting.category_key} " \
      "entries (pending > #{setting.stale_reject_after_days} days)"
    )

    stale.update_all(status: 2) # 2 = rejected enum value
  end

  def model_for(category_key)
    "Community#{category_key.camelize}".constantize
  rescue NameError
    nil
  end
end
