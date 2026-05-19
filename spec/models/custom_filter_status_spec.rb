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
require 'rails_helper'

RSpec.describe CustomFilterStatus do
  describe 'Associations' do
    it { is_expected.to belong_to(:custom_filter) }
    it { is_expected.to belong_to(:status) }
  end

  describe 'Validations' do
    subject { Fabricate.build :custom_filter_status }

    it { is_expected.to validate_uniqueness_of(:status_id).scoped_to(:custom_filter_id) }

    describe 'Status access' do
      subject { Fabricate.build :custom_filter_status, custom_filter:, status: }

      let(:custom_filter) { Fabricate :custom_filter }
      let(:status) { Fabricate :status }

      context 'when policy allows filter account to access status' do
        it { is_expected.to allow_value(status.id).for(:status_id) }
      end

      context 'when policy does not allow filter account to access status' do
        before { status.account.touch(:suspended_at) }

        it { is_expected.to_not allow_value(status.id).for(:status_id) }
      end
    end
  end
end
