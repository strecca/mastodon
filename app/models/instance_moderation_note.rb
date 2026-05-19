# frozen_string_literal: true

# == Schema Information
#
# Table name: instance_moderation_notes
#
#  id         :bigint           not null, primary key
#  content    :text
#  domain     :string           not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#
# Indexes
#
#  index_instance_moderation_notes_on_domain  (domain)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
class InstanceModerationNote < ApplicationRecord
  include DomainNormalizable
  include DomainMaterializable

  CONTENT_SIZE_LIMIT = 2_000

  belongs_to :account
  belongs_to :instance, inverse_of: :moderation_notes, foreign_key: :domain, primary_key: :domain, optional: true

  scope :chronological, -> { reorder(id: :asc) }

  validates :content, presence: true, length: { maximum: CONTENT_SIZE_LIMIT }
  validates :domain, presence: true, domain: true
end
