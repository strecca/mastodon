# frozen_string_literal: true

# == Schema Information
#
# Table name: custom_filter_statuses
#
#  id               :bigint           not null, primary key
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  custom_filter_id :bigint           not null
#  status_id        :bigint           not null
#
# Indexes
#
#  index_custom_filter_statuses_on_custom_filter_id                (custom_filter_id)
#  index_custom_filter_statuses_on_status_id_and_custom_filter_id  (status_id,custom_filter_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (custom_filter_id => custom_filters.id) ON DELETE => cascade
#  fk_rails_...  (status_id => statuses.id) ON DELETE => cascade
#

class CustomFilterStatus < ApplicationRecord
  include CustomFilterCache

  belongs_to :custom_filter
  belongs_to :status

  validates :status_id, uniqueness: { scope: :custom_filter_id }
  validate :validate_status_access, if: [:custom_filter_account, :status]

  delegate :account, to: :custom_filter, prefix: true, allow_nil: true

  private

  def validate_status_access
    errors.add(:status_id, :invalid) unless StatusPolicy.new(custom_filter_account, status).show?
  end
end
