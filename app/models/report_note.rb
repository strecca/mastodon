# frozen_string_literal: true

# == Schema Information
#
# Table name: report_notes
#
#  id         :bigint           not null, primary key
#  content    :text             not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#  report_id  :bigint           not null
#
# Indexes
#
#  index_report_notes_on_account_id  (account_id)
#  index_report_notes_on_report_id   (report_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (report_id => reports.id) ON DELETE => cascade
#

class ReportNote < ApplicationRecord
  CONTENT_SIZE_LIMIT = 2_000

  belongs_to :account
  belongs_to :report, inverse_of: :notes, touch: true

  scope :chronological, -> { reorder(id: :asc) }

  validates :content, presence: true, length: { maximum: CONTENT_SIZE_LIMIT }
end
