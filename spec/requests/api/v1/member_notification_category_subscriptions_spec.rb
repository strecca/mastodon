# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Member Notification Category Subscriptions' do
  let(:user)    { Fabricate(:user) }
  let(:token)   { Fabricate(:accessible_access_token, resource_owner_id: user.id) }
  let(:headers) { { 'Authorization' => "Bearer #{token.token}" } }

  describe 'POST /api/v1/member_notification_category_subscriptions' do
    subject do
      post '/api/v1/member_notification_category_subscriptions',
           headers: headers,
           params: { category_key: 'events' }
    end

    it 'creates a subscription for the current account' do
      expect { subject }.to change { MemberNotificationCategorySubscription.where(account: user.account).count }.by(1)
    end

    it 'returns the subscription with its display name' do
      subject

      expect(response.parsed_body['category_key']).to eq('events')
      expect(response.parsed_body['display_name']).to be_present
    end

    context 'when already subscribed to that category (idempotency)' do
      before { Fabricate(:member_notification_category_subscription, account: user.account, category_key: 'events') }

      it 'does not create a duplicate row' do
        expect { subject }.not_to(change { MemberNotificationCategorySubscription.where(account: user.account).count })
      end
    end
  end

  describe 'DELETE /api/v1/member_notification_category_subscriptions/:id' do
    let!(:subscription) { Fabricate(:member_notification_category_subscription, account: user.account, category_key: 'events') }

    it 'removes the subscription' do
      expect { delete "/api/v1/member_notification_category_subscriptions/#{subscription.id}", headers: headers }
        .to change { MemberNotificationCategorySubscription.exists?(subscription.id) }.from(true).to(false)
    end

    context "when the subscription belongs to a different account" do
      let(:other_user) { Fabricate(:user) }
      let(:other_token) { Fabricate(:accessible_access_token, resource_owner_id: other_user.id) }
      let(:other_headers) { { 'Authorization' => "Bearer #{other_token.token}" } }

      it 'returns not found and does not delete it' do
        delete "/api/v1/member_notification_category_subscriptions/#{subscription.id}", headers: other_headers

        expect(response).to have_http_status(:not_found)
        expect(MemberNotificationCategorySubscription.exists?(subscription.id)).to be true
      end
    end
  end
end
