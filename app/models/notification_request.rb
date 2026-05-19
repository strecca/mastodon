# frozen_string_literal: true

# == Schema Information
#
# Table name: notification_requests
#
#  id                  :bigint           not null, primary key
#  notifications_count :bigint           default(0), not null
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  account_id          :bigint           not null
#  from_account_id     :bigint           not null
#  last_status_id      :bigint
#
# Indexes
#
#  index_notification_requests_on_account_id_and_from_account_id  (account_id,from_account_id) UNIQUE
#  index_notification_requests_on_from_account_id                 (from_account_id)
#  index_notification_requests_on_last_status_id                  (last_status_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (from_account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (last_status_id => statuses.id) ON DELETE => nullify
#

class NotificationRequest < ApplicationRecord
  self.ignored_columns += %w(dismissed)

  include Paginable

  MAX_MEANINGFUL_COUNT = 100

  belongs_to :account
  belongs_to :from_account, class_name: 'Account'
  belongs_to :last_status, class_name: 'Status'

  before_save :prepare_notifications_count

  scope :without_suspended, -> { joins(:from_account).merge(Account.without_suspended) }

  def self.preload_cache_collection(requests)
    cached_statuses_by_id = yield(requests.filter_map(&:last_status)).index_by(&:id) # Call cache_collection in block

    requests.each do |request|
      request.last_status = cached_statuses_by_id[request.last_status_id] unless request.last_status_id.nil?
    end
  end

  def reconsider_existence!
    prepare_notifications_count

    if notifications_count.positive?
      save
    else
      destroy
    end
  end

  private

  def prepare_notifications_count
    self.notifications_count = Notification.where(account: account, from_account: from_account, type: [:mention, :quote], filtered: true).limit(MAX_MEANINGFUL_COUNT).count
  end
end
