# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Community Quick Shares' do
  let(:owner)   { Fabricate(:moderator_user).account }
  let(:token)   { Fabricate(:accessible_access_token, resource_owner_id: owner.user.id) }
  let(:headers) { { 'Authorization' => "Bearer #{token.token}" } }

  let(:quick_share) { Fabricate(:community_quick_share, account: owner) }

  describe 'POST /api/v1/community_quick_shares/:slug/share_as_post' do
    subject do
      post "/api/v1/community_quick_shares/#{quick_share.slug}/share_as_post",
           headers: headers,
           params: { text: 'Check out this recipe' }
    end

    context 'when it has not been shared as a post yet' do
      it 'posts exactly one status' do
        expect { subject }.to change { owner.statuses.count }.by(1)
      end

      it 'records the resulting status id on the quick share' do
        subject

        expect(quick_share.reload.mastodon_status_id).to eq(owner.statuses.last.id.to_s)
      end

      it 'includes both the caption text and the share url in the post' do
        subject

        text = owner.statuses.last.text
        expect(text).to include('Check out this recipe')
        expect(text).to include("/shared/#{quick_share.slug}")
      end
    end

    # The exact regression this spec exists to catch: calling share_as_post
    # a second time (double-click, retried request, etc.) must never post a
    # second status for the same quick share.
    context 'when it has already been shared as a post' do
      before { quick_share.update_column(:mastodon_status_id, '123456') }

      it 'does not post a second status' do
        expect { subject }.not_to change { owner.statuses.count }
      end

      it 'returns an error instead of succeeding silently' do
        subject

        expect(response).to have_http_status(422)
        expect(response.parsed_body['error']).to eq('Already shared as a post')
      end
    end

    context 'when called by someone other than the owner' do
      let(:other_account) { Fabricate(:moderator_user).account }
      let(:token)          { Fabricate(:accessible_access_token, resource_owner_id: other_account.user.id) }

      it 'is forbidden and does not post anything' do
        expect { subject }.not_to change { owner.statuses.count }

        expect(response).to have_http_status(403)
      end
    end

    context 'with no text' do
      subject do
        post "/api/v1/community_quick_shares/#{quick_share.slug}/share_as_post",
             headers: headers,
             params: { text: '' }
      end

      it 'does not post anything' do
        expect { subject }.not_to change { owner.statuses.count }

        expect(response).to have_http_status(422)
      end
    end
  end

  describe 'POST /api/v1/community_quick_shares' do
    subject do
      post '/api/v1/community_quick_shares',
           headers: headers,
           params: { caption: 'Not a real PDF' }
    end

    context 'when the account is not Moderator or Administrator' do
      let(:owner) { Fabricate(:user).account }

      it 'is forbidden' do
        subject

        expect(response).to have_http_status(403)
      end
    end

    context 'with no pdf_file' do
      it 'is rejected with a clear error rather than a server error' do
        subject

        expect(response).to have_http_status(422)
        expect(response.parsed_body['error']).to eq('A PDF file is required')
      end
    end
  end
end
