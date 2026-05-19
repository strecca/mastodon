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
require 'rails_helper'

RSpec.describe ReportNote do
  describe 'Scopes' do
    describe '.chronological' do
      it 'returns report notes oldest to newest' do
        report = Fabricate(:report)
        note1 = Fabricate(:report_note, report: report)
        note2 = Fabricate(:report_note, report: report)

        expect(report.notes.chronological).to eq [note1, note2]
      end
    end
  end

  describe 'Validations' do
    subject { Fabricate.build :report_note }

    describe 'content' do
      it { is_expected.to_not allow_value('').for(:content) }
      it { is_expected.to validate_length_of(:content).is_at_most(described_class::CONTENT_SIZE_LIMIT) }
    end
  end
end
