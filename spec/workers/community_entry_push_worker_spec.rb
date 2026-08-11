# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CommunityEntryPushWorker do
  subject { described_class.new }

  let(:user)         { Fabricate(:user) }
  let(:recipient)    { user.account }
  let(:sender)       { Fabricate(:account) }
  let(:listing)      { Fabricate(:community_listing, account: sender) }
  let(:notification) do
    Fabricate(:community_entry_notification, recipient: recipient, sender: sender,
                                              notifiable: listing, category_key: 'listings', kind: :new_entry)
  end

  describe '#perform' do
    context 'when the recipient has an active push subscription' do
      let!(:subscription) { Fabricate(:web_push_subscription, user: user) }

      it 'delivers via WebPushDeliveryService and marks browser_pushed_at' do
        delivery = instance_double(WebPushDeliveryService, call: nil)
        allow(WebPushDeliveryService).to receive(:new).and_return(delivery)

        subject.perform(notification.id)

        expect(delivery).to have_received(:call).with(subscription, kind_of(String))
        expect(notification.reload.browser_pushed_at).to be_present
      end

      it 'includes the community_entry_notification_id and category display name in the payload' do
        payload = nil
        delivery = instance_double(WebPushDeliveryService)
        allow(WebPushDeliveryService).to receive(:new).and_return(delivery)
        allow(delivery).to receive(:call) { |_subscription, json| payload = JSON.parse(json) }

        subject.perform(notification.id)

        expect(payload['community_entry_notification_id']).to eq(notification.id)
        expect(payload['title']).to include('Listings')
        expect(payload['url']).to eq("/community_listings/#{listing.id}")
      end
    end

    context 'when the recipient has no active push subscription' do
      it 'does not attempt delivery and leaves browser_pushed_at nil' do
        expect(WebPushDeliveryService).not_to receive(:new)

        subject.perform(notification.id)

        expect(notification.reload.browser_pushed_at).to be_nil
      end
    end

    context 'when already pushed' do
      let!(:subscription) { Fabricate(:web_push_subscription, user: user) }

      it 'does not push again' do
        notification.update_column(:browser_pushed_at, Time.current)

        expect(WebPushDeliveryService).not_to receive(:new)

        subject.perform(notification.id)
      end
    end

    context 'when the notification has since been deleted' do
      it 'does not raise' do
        id = notification.id
        notification.destroy!
        expect { subject.perform(id) }.not_to raise_error
      end
    end
  end
end
