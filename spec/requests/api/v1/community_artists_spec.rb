# frozen_string_literal: true

require 'rails_helper'

# Regression spec for the shared CommunityCategoryController concern
# (app/controllers/concerns/community_category_controller.rb), written
# 2026-10-05 as part of consolidating five near-identical generated
# controllers. Artists is the proving category -- these specs exercise the
# shared concern's actual behavior, not Artists-specific logic, so a bug
# introduced in the concern would show up here across any of the five it's
# used by.
RSpec.describe 'Community Artists' do
  let(:owner)   { Fabricate(:user).account }
  let(:token)   { Fabricate(:accessible_access_token, resource_owner_id: owner.user.id) }
  let(:headers) { { 'Authorization' => "Bearer #{token.token}" } }

  describe 'GET /api/v1/community_artists' do
    before do
      Fabricate(:community_artist, first_name: 'Approved', status: :approved)
      Fabricate(:community_artist, first_name: 'Pending', status: :pending)
    end

    it 'succeeds without authentication' do
      get '/api/v1/community_artists'

      expect(response).to have_http_status(200)
    end

    it 'only returns approved entries' do
      get '/api/v1/community_artists'

      names = response.parsed_body['entries'].map { |e| e['first_name'] }
      expect(names).to include('Approved')
      expect(names).not_to include('Pending')
    end

    # The exact question this spec exists to answer: dropping the redundant
    # `list_columns` override (image_media_ids was already covered by
    # config.json's show_in_list) must not drop the field from the response.
    it 'includes image_media_ids in the list response' do
      get '/api/v1/community_artists'

      expect(response.parsed_body['entries'].first).to have_key('image_media_ids')
    end

    it 'sorts by first_name ascending when sort=az' do
      Fabricate(:community_artist, first_name: 'Aaa', status: :approved)
      Fabricate(:community_artist, first_name: 'Zzz', status: :approved)

      get '/api/v1/community_artists', params: { sort: 'az' }

      names = response.parsed_body['entries'].map { |e| e['first_name'] }
      expect(names).to eq(names.sort)
    end
  end

  describe 'GET /api/v1/community_artists/:id' do
    let(:entry) { Fabricate(:community_artist, status: :approved) }

    it 'succeeds without authentication and includes detail-only fields' do
      get "/api/v1/community_artists/#{entry.id}"

      expect(response).to have_http_status(200)
      expect(response.parsed_body).to have_key('artist_description')
    end
  end

  describe 'POST /api/v1/community_artists' do
    let(:valid_params) do
      { entry: { category: ['Sculptor'], location_town_city: 'Civezza', first_name: 'New',
                 last_name: 'Artist', artist_description: 'Desc', contact_info_1: 'a@b.com' } }
    end

    it 'requires authentication' do
      post '/api/v1/community_artists', params: valid_params

      # require_user! (Api::BaseController) renders 422 for an unauthenticated
      # caller, not 401 -- 401 is reserved for require_authenticated_user!,
      # which these create/update/destroy actions don't use.
      expect(response).to have_http_status(422)
    end

    context 'with no category setting (default requires_approval)' do
      it 'creates the entry as pending' do
        post '/api/v1/community_artists', headers: headers, params: valid_params

        expect(response).to have_http_status(201)
        expect(response.parsed_body['status']).to eq('pending')
      end

      it 'emails the submitter via CommunityDirectoryMailer, not the notify worker' do
        allow(CommunityDirectoryMailer).to receive(:entry_submitted).and_return(double(deliver_later: true))
        allow(CommunityEntryNotifyWorker).to receive(:perform_async)

        post '/api/v1/community_artists', headers: headers, params: valid_params

        expect(CommunityDirectoryMailer).to have_received(:entry_submitted)
        expect(CommunityEntryNotifyWorker).not_to have_received(:perform_async)
      end
    end

    context 'when the account is trusted (auto-approved)' do
      before do
        CommunityDirectoryPermission.create!(account: owner, trusted: true, category_key: nil)
      end

      it 'creates the entry as approved and fires the notify worker' do
        allow(CommunityEntryNotifyWorker).to receive(:perform_async)

        post '/api/v1/community_artists', headers: headers, params: valid_params

        expect(response.parsed_body['status']).to eq('approved')
        expect(CommunityEntryNotifyWorker).to have_received(:perform_async)
          .with('new_entry', 'CommunityArtist', response.parsed_body['id'], 'artists')
      end
    end

    context 'with missing required fields' do
      it 'returns validation errors' do
        post '/api/v1/community_artists', headers: headers, params: { entry: { first_name: '' } }

        expect(response).to have_http_status(422)
        expect(response.parsed_body['errors']).to be_present
      end
    end

    context 'when the account has hit its rate limit' do
      before do
        # requires_approval must stay true (the default) here: check_rate_limit
        # exempts auto-approved accounts entirely (`return nil if auto_approve?`),
        # so requires_approval: false would make this setting a no-op.
        CommunityDirectoryCategorySetting.create!(category_key: 'artists', max_entries_per_account: 1, requires_approval: true)
        Fabricate(:community_artist, account: owner, status: :approved)
      end

      it 'is rejected with 429' do
        post '/api/v1/community_artists', headers: headers, params: valid_params

        expect(response).to have_http_status(429)
      end
    end
  end

  describe 'PATCH /api/v1/community_artists/:id' do
    let(:entry) { Fabricate(:community_artist, account: owner, status: :approved) }

    it 'allows the owner to update' do
      patch "/api/v1/community_artists/#{entry.id}", headers: headers,
                                                       params: { entry: { first_name: 'Updated' } }

      expect(response).to have_http_status(200)
      expect(entry.reload.first_name).to eq('Updated')
    end

    context 'when called by someone other than the owner' do
      let(:other)         { Fabricate(:user).account }
      let(:other_token)   { Fabricate(:accessible_access_token, resource_owner_id: other.user.id) }
      let(:other_headers) { { 'Authorization' => "Bearer #{other_token.token}" } }

      it 'is forbidden' do
        patch "/api/v1/community_artists/#{entry.id}", headers: other_headers,
                                                         params: { entry: { first_name: 'Hijacked' } }

        expect(response).to have_http_status(403)
        expect(entry.reload.first_name).not_to eq('Hijacked')
      end
    end

    # authorize_owner! checks current_user.can?(:administrator), and in this
    # app's role model only Owner carries that specific permission bit --
    # confirmed directly against the seeded roles (Admin: 2031612, Owner: 1).
    # Admin itself does not satisfy this check, however surprising that is.
    context 'when called by an owner' do
      let(:admin)         { Fabricate(:owner_user).account }
      let(:admin_token)   { Fabricate(:accessible_access_token, resource_owner_id: admin.user.id) }
      let(:admin_headers) { { 'Authorization' => "Bearer #{admin_token.token}" } }

      it 'is allowed' do
        patch "/api/v1/community_artists/#{entry.id}", headers: admin_headers,
                                                         params: { entry: { first_name: 'ModeratedEdit' } }

        expect(response).to have_http_status(200)
        expect(entry.reload.first_name).to eq('ModeratedEdit')
      end
    end

    context 'when called by a category steward' do
      let(:steward)         { Fabricate(:user).account }
      let(:steward_token)   { Fabricate(:accessible_access_token, resource_owner_id: steward.user.id) }
      let(:steward_headers) { { 'Authorization' => "Bearer #{steward_token.token}" } }

      before do
        CommunityDirectoryPermission.create!(account: steward, category_key: 'artists', is_steward: true)
      end

      it 'is allowed' do
        patch "/api/v1/community_artists/#{entry.id}", headers: steward_headers,
                                                         params: { entry: { first_name: 'StewardEdit' } }

        expect(response).to have_http_status(200)
        expect(entry.reload.first_name).to eq('StewardEdit')
      end
    end
  end

  describe 'DELETE /api/v1/community_artists/:id' do
    # let! (not let): the entry must exist BEFORE the expect{}.to change
    # block runs below, or its lazy creation happens inside the block and
    # gets counted as part of the change being measured.
    let!(:entry) { Fabricate(:community_artist, account: owner, status: :approved) }

    it 'allows the owner to delete' do
      expect {
        delete "/api/v1/community_artists/#{entry.id}", headers: headers
      }.to change(CommunityArtist, :count).by(-1)

      expect(response).to have_http_status(204)
    end

    context 'when called by someone other than the owner' do
      let(:other)         { Fabricate(:user).account }
      let(:other_token)   { Fabricate(:accessible_access_token, resource_owner_id: other.user.id) }
      let(:other_headers) { { 'Authorization' => "Bearer #{other_token.token}" } }

      it 'is forbidden and does not delete' do
        expect {
          delete "/api/v1/community_artists/#{entry.id}", headers: other_headers
        }.not_to change(CommunityArtist, :count)

        expect(response).to have_http_status(403)
      end
    end
  end
end
