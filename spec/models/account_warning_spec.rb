# frozen_string_literal: true

# == Schema Information
#
# Table name: account_warnings
#
#  id                :bigint           not null, primary key
#  action            :integer          default("none"), not null
#  overruled_at      :datetime
#  status_ids        :string           is an Array
#  text              :text             default(""), not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint
#  report_id         :bigint
#  target_account_id :bigint
#
# Indexes
#
#  index_account_warnings_on_account_id         (account_id)
#  index_account_warnings_on_target_account_id  (target_account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => nullify
#  fk_rails_...  (report_id => reports.id) ON DELETE => cascade
#  fk_rails_...  (target_account_id => accounts.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe AccountWarning do
  describe 'Normalizations' do
    describe 'text' do
      it { is_expected.to normalize(:text).from(nil).to('') }
    end
  end

  describe '#appeal_eligible?' do
    context 'when created too long ago' do
      subject { Fabricate.build :account_warning, created_at: (described_class::APPEAL_WINDOW * 2).ago }

      it { is_expected.to_not be_appeal_eligible }
    end

    context 'when created recently' do
      subject { Fabricate.build :account_warning, created_at: (described_class::APPEAL_WINDOW - 2.days).ago }

      it { is_expected.to be_appeal_eligible }
    end
  end
end
