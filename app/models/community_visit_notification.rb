# frozen_string_literal: true

# == Schema Information
#
# Table name: community_visit_notifications
#
#  id                   :bigint           not null, primary key
#  browser_pushed_at    :datetime
#  emailed_at           :datetime
#  kind                 :integer          not null
#  message              :text
#  read_at              :datetime
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  community_visit_id   :bigint
#  recipient_account_id :bigint           not null
#  sender_account_id    :bigint
#
# Indexes
#
#  idx_community_visit_notifs_inbox                             (recipient_account_id,created_at)
#  idx_community_visit_notifs_unread                            (recipient_account_id,read_at)
#  idx_community_visit_notifs_visit                             (community_visit_id)
#  index_community_visit_notifications_on_community_visit_id    (community_visit_id)
#  index_community_visit_notifications_on_recipient_account_id  (recipient_account_id)
#  index_community_visit_notifications_on_sender_account_id     (sender_account_id)
#
# Foreign Keys
#
#  fk_rails_...  (community_visit_id => community_visits.id)
#  fk_rails_...  (recipient_account_id => accounts.id)
#  fk_rails_...  (sender_account_id => accounts.id)
#
class CommunityVisitNotification < ApplicationRecord
  belongs_to :recipient, class_name: 'Account', foreign_key: :recipient_account_id
  belongs_to :sender,    class_name: 'Account', foreign_key: :sender_account_id, optional: true
  belongs_to :visit,     class_name: 'CommunityVisit',
             foreign_key: :community_visit_id, optional: true

  enum :kind, {
    overlap_detected: 0,
    friend_ping:      1,
    visit_updated:    2,
    new_member_joined: 3,
  }

  validates :kind, presence: true

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
