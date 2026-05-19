# frozen_string_literal: true

# == Schema Information
#
# Table name: notification_requests
#
#  id                  :bigint           not null, primary key
#  notifications_count :bigint           default(0), not null
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  account_id          :bigint           not null
#  from_account_id     :bigint           not null
#  last_status_id      :bigint
#
# Indexes
#
#  index_notification_requests_on_account_id_and_from_account_id  (account_id,from_account_id) UNIQUE
#  index_notification_requests_on_from_account_id                 (from_account_id)
#  index_notification_requests_on_last_status_id                  (last_status_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (from_account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (last_status_id => statuses.id) ON DELETE => nullify
#
require 'rails_helper'

RSpec.describe NotificationRequest do
  describe '#reconsider_existence!' do
    subject { Fabricate(:notification_request) }

    context 'when there are remaining notifications' do
      before do
        Fabricate(:notification, account: subject.account, activity: Fabricate(:status, account: subject.from_account), filtered: true, type: :mention)
        subject.reconsider_existence!
      end

      it 'leaves request intact' do
        expect(subject.destroyed?).to be false
      end

      it 'updates notifications_count' do
        expect(subject.notifications_count).to eq 1
      end
    end

    context 'when there are no notifications' do
      before do
        subject.reconsider_existence!
      end

      it 'removes the request' do
        expect(subject.destroyed?).to be true
      end
    end
  end
end
