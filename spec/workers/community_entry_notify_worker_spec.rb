# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CommunityEntryNotifyWorker do
  subject { described_class.new }

  describe '#perform with kind: new_entry' do
    let(:poster)    { Fabricate(:account) }
    let(:listing)   { Fabricate(:community_listing, account: poster) }

    it 'notifies an account subscribed to the category' do
      subscriber = Fabricate(:account)
      Fabricate(:member_notification_category_subscription, account: subscriber, category_key: 'listings')

      expect { subject.perform('new_entry', 'CommunityListing', listing.id, 'listings') }
        .to change { CommunityEntryNotification.for_recipient(subscriber).count }.by(1)
    end

    it 'notifies an account that specifically targets the poster, even without a category subscription' do
      follower = Fabricate(:account)
      Fabricate(:member_notification_target, account: follower, target_account: poster)

      expect { subject.perform('new_entry', 'CommunityListing', listing.id, 'listings') }
        .to change { CommunityEntryNotification.for_recipient(follower).count }.by(1)
    end

    it 'does not notify an unrelated account with no subscription or target' do
      bystander = Fabricate(:account)

      expect { subject.perform('new_entry', 'CommunityListing', listing.id, 'listings') }
        .not_to(change { CommunityEntryNotification.for_recipient(bystander).count })
    end

    it 'never notifies the poster about their own entry' do
      Fabricate(:member_notification_category_subscription, account: poster, category_key: 'listings')

      expect { subject.perform('new_entry', 'CommunityListing', listing.id, 'listings') }
        .not_to(change { CommunityEntryNotification.for_recipient(poster).count })
    end

    it 'notifies a matching account only once, even if both subscribed and targeted' do
      subscriber_and_follower = Fabricate(:account)
      Fabricate(:member_notification_category_subscription, account: subscriber_and_follower, category_key: 'listings')
      Fabricate(:member_notification_target, account: subscriber_and_follower, target_account: poster)

      expect { subject.perform('new_entry', 'CommunityListing', listing.id, 'listings') }
        .to change { CommunityEntryNotification.for_recipient(subscriber_and_follower).count }.by(1)
    end

    context 'when the recipient is in their quiet-hours window' do
      it 'creates the notification row but does not enqueue a push' do
        recipient = Fabricate(:account)
        Fabricate(:member_notification_category_subscription, account: recipient, category_key: 'listings')
        Fabricate(:member_notification_preference, account: recipient, quiet_hours_enabled: true,
                                                     quiet_hours_start: '00:00', quiet_hours_end: '23:59',
                                                     quiet_hours_timezone: 'UTC')

        expect(CommunityEntryPushWorker).not_to receive(:perform_async)

        expect { subject.perform('new_entry', 'CommunityListing', listing.id, 'listings') }
          .to change { CommunityEntryNotification.for_recipient(recipient).count }.by(1)
      end
    end

    context 'when the recipient is not in quiet hours' do
      it 'enqueues a push for the created notification' do
        recipient = Fabricate(:account)
        Fabricate(:member_notification_category_subscription, account: recipient, category_key: 'listings')

        expect(CommunityEntryPushWorker).to receive(:perform_async) do |notification_id|
          expect(CommunityEntryNotification.find(notification_id).recipient_account_id).to eq(recipient.id)
        end

        subject.perform('new_entry', 'CommunityListing', listing.id, 'listings')
      end
    end

    context 'when the entry has since been deleted' do
      it 'does not raise' do
        listing.destroy!
        expect { subject.perform('new_entry', 'CommunityListing', listing.id, 'listings') }.not_to raise_error
      end
    end
  end

  describe '#perform with kind: entry_response' do
    let(:owner)     { Fabricate(:account) }
    let(:listing)   { Fabricate(:community_listing, account: owner) }
    let(:responder) { Fabricate(:account) }
    let(:interest)  { Fabricate(:community_listing_interest, community_listing: listing, account: responder) }

    it 'notifies an account watching the listing' do
      watcher = Fabricate(:account)
      Fabricate(:community_entry_watch, account: watcher, watchable: listing)

      expect { subject.perform('entry_response', 'CommunityListingInterest', interest.id) }
        .to change { CommunityEntryNotification.for_recipient(watcher).count }.by(1)
    end

    it 'does not notify the person who expressed the interest, even if they watch their own action' do
      Fabricate(:community_entry_watch, account: responder, watchable: listing)

      expect { subject.perform('entry_response', 'CommunityListingInterest', interest.id) }
        .not_to(change { CommunityEntryNotification.for_recipient(responder).count })
    end

    it 'does not notify the listing owner via the watch path (they already get CommunityListingNotifyWorker)' do
      Fabricate(:community_entry_watch, account: owner, watchable: listing)

      expect { subject.perform('entry_response', 'CommunityListingInterest', interest.id) }
        .not_to(change { CommunityEntryNotification.for_recipient(owner).count })
    end
  end
end
