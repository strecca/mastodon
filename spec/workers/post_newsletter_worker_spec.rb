# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PostNewsletterWorker do
  subject { described_class.new }

  let(:admin_account) { Fabricate(:account, username: 'newsletteradmin') }
  let(:newsletter) do
    Fabricate(:community_newsletter, status: :published, title: 'Edition One', slug: 'edition-one')
  end

  before do
    Setting.site_contact_username = admin_account.username
  end

  describe '#perform' do
    context 'when the newsletter has no mastodon_status_id yet' do
      it 'posts exactly one status and records its id' do
        expect { subject.perform(newsletter.id) }
          .to change { admin_account.statuses.count }.by(1)

        newsletter.reload
        expect(newsletter.mastodon_status_id).to eq(admin_account.statuses.last.id.to_s)
      end

      it 'includes the newsletter url in the posted status text' do
        subject.perform(newsletter.id)

        expect(admin_account.statuses.last.text).to include("/newsletters/#{newsletter.slug}")
      end
    end

    context 'when the newsletter already has a mastodon_status_id (the double-post guard)' do
      before { newsletter.update_column(:mastodon_status_id, '123456') }

      it 'does not post a new status' do
        expect { subject.perform(newsletter.id) }
          .not_to change { admin_account.statuses.count }
      end
    end

    context 'when a status for this exact slug url already exists (re-import scenario)' do
      let!(:existing_status) do
        Fabricate(:status, account: admin_account, text: "Old Title\n\nhttps://#{Rails.configuration.x.web_domain}/newsletters/edition-one")
      end

      it 'backfills mastodon_status_id from the existing status instead of posting a duplicate' do
        expect { subject.perform(newsletter.id) }
          .not_to change { admin_account.statuses.count }

        expect(newsletter.reload.mastodon_status_id).to eq(existing_status.id.to_s)
      end
    end

    context 'when the newsletter is not published' do
      let(:newsletter) { Fabricate(:community_newsletter, status: :draft) }

      it 'does not post a status' do
        expect { subject.perform(newsletter.id) }
          .not_to change { admin_account.statuses.count }
      end
    end

    context 'when the newsletter no longer exists' do
      it 'does not raise' do
        expect { subject.perform(-1) }.not_to raise_error
      end
    end
  end
end
