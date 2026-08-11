# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MemberNotificationPreference do
  describe '#in_quiet_hours?' do
    subject { Fabricate(:member_notification_preference, quiet_hours_enabled: true, quiet_hours_timezone: 'UTC') }

    context 'when quiet hours are disabled' do
      subject { Fabricate(:member_notification_preference, quiet_hours_enabled: false) }

      it 'is never in quiet hours, even with start/end set' do
        subject.update!(quiet_hours_start: '22:00', quiet_hours_end: '07:00')
        expect(subject.in_quiet_hours?(at: Time.utc(2026, 1, 1, 23, 0))).to be false
      end
    end

    context 'when the window does not cross midnight (e.g. 09:00-17:00)' do
      before { subject.update!(quiet_hours_start: '09:00', quiet_hours_end: '17:00') }

      it 'is in quiet hours inside the window' do
        expect(subject.in_quiet_hours?(at: Time.utc(2026, 1, 1, 12, 0))).to be true
      end

      it 'is not in quiet hours before the window' do
        expect(subject.in_quiet_hours?(at: Time.utc(2026, 1, 1, 8, 0))).to be false
      end

      it 'is not in quiet hours after the window' do
        expect(subject.in_quiet_hours?(at: Time.utc(2026, 1, 1, 18, 0))).to be false
      end
    end

    context 'when the window crosses midnight (e.g. 22:00-07:00)' do
      before { subject.update!(quiet_hours_start: '22:00', quiet_hours_end: '07:00') }

      it 'is in quiet hours late at night' do
        expect(subject.in_quiet_hours?(at: Time.utc(2026, 1, 1, 23, 30))).to be true
      end

      it 'is in quiet hours early in the morning' do
        expect(subject.in_quiet_hours?(at: Time.utc(2026, 1, 1, 3, 0))).to be true
      end

      it 'is not in quiet hours during the afternoon' do
        expect(subject.in_quiet_hours?(at: Time.utc(2026, 1, 1, 14, 0))).to be false
      end
    end

    context 'when start/end are not set' do
      it 'is never in quiet hours' do
        expect(subject.in_quiet_hours?(at: Time.utc(2026, 1, 1, 23, 0))).to be false
      end
    end
  end

  describe '.for_account' do
    it 'finds an existing preference without creating a duplicate' do
      account = Fabricate(:account)
      existing = Fabricate(:member_notification_preference, account: account)

      expect(described_class.for_account(account)).to eq(existing)
    end

    it 'initializes (without saving) a new record when none exists' do
      account = Fabricate(:account)

      pref = described_class.for_account(account)

      expect(pref).to be_new_record
      expect(pref.account).to eq(account)
    end
  end
end
