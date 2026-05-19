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
Fabricator(:report_note) do
  report { Fabricate.build(:report) }
  account { Fabricate.build(:account) }
  content { Faker::Lorem.sentences }
end
