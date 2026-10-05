# frozen_string_literal: true

require 'rails_helper'

# Services shares CommunityCategoryController with Artists (see
# community_artists_spec.rb for full shared-logic coverage) -- the one
# test that matters most here is the bug fix: the original
# community_services_controller.rb#create never called
# CommunityEntryNotifyWorker, so subscribers were never notified about new
# Services entries. Moving to the shared concern fixes this automatically;
# this spec exists to prove it, not just assume it.
RSpec.describe 'Community Services' do
  let(:owner)   { Fabricate(:user).account }
  let(:token)   { Fabricate(:accessible_access_token, resource_owner_id: owner.user.id) }
  let(:headers) { { 'Authorization' => "Bearer #{token.token}" } }

  describe 'POST /api/v1/community_services' do
    let(:valid_params) do
      { entry: { name: 'New Service', category: ['Plumbing'], town: 'Civezza', description: 'Desc' } }
    end

    it 'creates the entry as pending by default' do
      post '/api/v1/community_services', headers: headers, params: valid_params

      expect(response).to have_http_status(201)
      expect(response.parsed_body['status']).to eq('pending')
    end

    # The actual bug fix verification.
    context 'when the account is trusted (auto-approved)' do
      before do
        CommunityDirectoryPermission.create!(account: owner, trusted: true, category_key: nil)
      end

      it 'fires CommunityEntryNotifyWorker, which it previously never did' do
        allow(CommunityEntryNotifyWorker).to receive(:perform_async)

        post '/api/v1/community_services', headers: headers, params: valid_params

        expect(response.parsed_body['status']).to eq('approved')
        expect(CommunityEntryNotifyWorker).to have_received(:perform_async)
          .with('new_entry', 'CommunityService', response.parsed_body['id'], 'services')
      end
    end
  end

  describe 'GET /api/v1/community_services' do
    it 'sorts by name ascending when sort=az' do
      Fabricate(:community_service, name: 'Zzz Repairs', status: :approved)
      Fabricate(:community_service, name: 'Aaa Repairs', status: :approved)

      get '/api/v1/community_services', params: { sort: 'az' }

      names = response.parsed_body['entries'].map { |e| e['name'] }
      expect(names).to eq(['Aaa Repairs', 'Zzz Repairs'])
    end
  end

  describe 'PATCH /api/v1/community_services/:id' do
    let!(:entry) { Fabricate(:community_service, account: owner, status: :approved) }

    context 'when called by someone other than the owner' do
      let(:other)         { Fabricate(:user).account }
      let(:other_token)   { Fabricate(:accessible_access_token, resource_owner_id: other.user.id) }
      let(:other_headers) { { 'Authorization' => "Bearer #{other_token.token}" } }

      it 'is forbidden' do
        patch "/api/v1/community_services/#{entry.id}", headers: other_headers,
                                                            params: { entry: { name: 'Hijacked' } }

        expect(response).to have_http_status(403)
      end
    end
  end

  describe 'DELETE /api/v1/community_services/:id' do
    let!(:entry) { Fabricate(:community_service, account: owner, status: :approved) }

    it 'allows the owner to delete' do
      expect {
        delete "/api/v1/community_services/#{entry.id}", headers: headers
      }.to change(CommunityService, :count).by(-1)

      expect(response).to have_http_status(204)
    end
  end
end
