# frozen_string_literal: true

# == Schema Information
#
# Table name: conversations
#
#  id                :bigint           not null, primary key
#  uri               :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  parent_account_id :bigint
#  parent_status_id  :bigint
#
# Indexes
#
#  index_conversations_on_parent_status_id  (parent_status_id) UNIQUE WHERE (parent_status_id IS NOT NULL)
#  index_conversations_on_uri               (uri) UNIQUE WHERE (uri IS NOT NULL)
#

class Conversation < ApplicationRecord
  validates :uri, uniqueness: true, if: :uri?

  has_many :statuses, dependent: nil

  belongs_to :parent_status, class_name: 'Status', optional: true, inverse_of: :owned_conversation
  belongs_to :parent_account, class_name: 'Account', optional: true

  scope :local, -> { where(uri: nil) }

  before_validation :set_parent_account, on: :create

  def to_param
    "#{parent_account_id}-#{parent_status_id}" unless parent_account_id.nil? || parent_status_id.nil?
  end

  def local?
    uri.nil?
  end

  def object_type
    :conversation
  end

  private

  def set_parent_account
    self.parent_account = parent_status.account if parent_status.present?
  end
end
