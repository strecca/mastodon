# frozen_string_literal: true

# == Schema Information
#
# Table name: web_push_subscriptions
#
#  id              :bigint           not null, primary key
#  data            :json
#  endpoint        :string           not null
#  key_auth        :string           not null
#  key_p256dh      :string           not null
#  standard        :boolean          default(FALSE), not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  access_token_id :bigint           not null
#  user_id         :bigint           not null
#
# Indexes
#
#  index_web_push_subscriptions_on_access_token_id  (access_token_id) WHERE (access_token_id IS NOT NULL)
#  index_web_push_subscriptions_on_user_id          (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (access_token_id => oauth_access_tokens.id) ON DELETE => cascade
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe Web::PushSubscription do
  subject { described_class.new(data: data) }

  let(:account) { Fabricate(:account) }

  let(:policy) { 'all' }

  let(:data) do
    {
      policy: policy,

      alerts: {
        mention: true,
        reblog: false,
        follow: true,
        follow_request: false,
        favourite: true,
      },
    }
  end

  describe '#pushable?' do
    let(:notification_type) { :mention }
    let(:notification) { Fabricate(:notification, account: account, type: notification_type) }

    %i(mention reblog follow follow_request favourite).each do |type|
      context "when notification is a #{type}" do
        let(:notification_type) { type }

        it 'returns boolean corresponding to alert setting' do
          expect(subject.pushable?(notification)).to eq data[:alerts][type]
        end
      end
    end

    context 'when policy is all' do
      let(:policy) { 'all' }

      it 'returns true' do
        expect(subject.pushable?(notification)).to be true
      end
    end

    context 'when policy is none' do
      let(:policy) { 'none' }

      it 'returns false' do
        expect(subject.pushable?(notification)).to be false
      end
    end

    context 'when policy is followed' do
      let(:policy) { 'followed' }

      context 'when notification is from someone you follow' do
        before do
          account.follow!(notification.from_account)
        end

        it 'returns true' do
          expect(subject.pushable?(notification)).to be true
        end
      end

      context 'when notification is not from someone you follow' do
        it 'returns false' do
          expect(subject.pushable?(notification)).to be false
        end
      end
    end

    context 'when policy is follower' do
      let(:policy) { 'follower' }

      context 'when notification is from someone who follows you' do
        before do
          notification.from_account.follow!(account)
        end

        it 'returns true' do
          expect(subject.pushable?(notification)).to be true
        end
      end

      context 'when notification is not from someone who follows you' do
        it 'returns false' do
          expect(subject.pushable?(notification)).to be false
        end
      end
    end
  end

  describe 'Delegations' do
    it { is_expected.to delegate_method(:token).to(:access_token).with_prefix(:associated_access) }
  end
end
