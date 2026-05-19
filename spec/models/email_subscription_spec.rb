# frozen_string_literal: true

# == Schema Information
#
# Table name: email_subscriptions
#
#  id                 :bigint           not null, primary key
#  confirmation_token :string
#  confirmed_at       :datetime
#  email              :string           not null
#  locale             :string           not null
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  account_id         :bigint           not null
#
# Indexes
#
#  index_email_subscriptions_on_account_id            (account_id)
#  index_email_subscriptions_on_account_id_and_email  (account_id,email) UNIQUE
#  index_email_subscriptions_on_confirmation_token    (confirmation_token) UNIQUE WHERE (confirmation_token IS NOT NULL)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe EmailSubscription do
  describe '#confirmed?' do
    it 'returns true when confirmed' do
      subject.confirmed_at = Time.now.utc
      expect(subject.confirmed?).to be true
    end

    it 'returns false when not confirmed' do
      subject.confirmed_at = nil
      expect(subject.confirmed?).to be false
    end
  end

  describe '#confirm!' do
    subject { Fabricate(:email_subscription) }

    it 'records confirmation time' do
      subject.confirm!
      expect(subject.confirmed_at).to_not be_nil
    end
  end

  describe 'Callbacks' do
    subject { Fabricate(:email_subscription) }

    it 'generates token and delivers confirmation email', :inline_jobs do
      emails = capture_emails { subject }

      expect(subject.confirmed_at).to be_nil
      expect(subject.confirmation_token).to_not be_nil
      expect(emails.size).to eq(1)
      expect(emails.first)
        .to have_attributes(
          to: contain_exactly(subject.email),
          subject: eq(I18n.t('email_subscription_mailer.confirmation.subject', name: subject.account.username, domain: Rails.configuration.x.local_domain))
        )
    end
  end
end
