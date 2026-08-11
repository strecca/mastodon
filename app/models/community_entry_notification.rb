# frozen_string_literal: true

# == Schema Information
#
# Table name: community_entry_notifications
#
#  id                    :bigint           not null, primary key
#  browser_pushed_at     :datetime
#  category_key          :string           not null
#  emailed_at            :datetime
#  kind                  :integer          not null
#  notifiable_type        :string           not null
#  read_at               :datetime
#  created_at            :datetime         not null
#  updated_at            :datetime         not null
#  notifiable_id          :bigint           not null
#  recipient_account_id  :bigint           not null
#  sender_account_id     :bigint
#
# Indexes
#
#  idx_community_entry_notifs_inbox        (recipient_account_id,created_at)
#  idx_community_entry_notifs_needs_email  (emailed_at)
#  idx_community_entry_notifs_needs_push   (browser_pushed_at)
#  idx_community_entry_notifs_unread       (recipient_account_id,read_at)
#
# Foreign Keys
#
#  fk_rails_...  (recipient_account_id => accounts.id)
#  fk_rails_...  (sender_account_id => accounts.id)
#
class CommunityEntryNotification < ApplicationRecord
  belongs_to :recipient, class_name: 'Account', foreign_key: :recipient_account_id
  belongs_to :sender,    class_name: 'Account', foreign_key: :sender_account_id, optional: true
  belongs_to :notifiable, polymorphic: true

  enum :kind, { new_entry: 0, entry_response: 1 }

  validates :kind, presence: true
  validates :category_key, presence: true

  scope :unread,        -> { where(read_at: nil) }
  scope :for_recipient, ->(account) { where(recipient_account_id: account.id) }
  scope :needs_email,   -> { where(emailed_at: nil) }
  scope :needs_push,    -> { where(browser_pushed_at: nil) }

  def read?
    read_at.present?
  end

  def mark_read!
    touch(:read_at) unless read?
  end
end
