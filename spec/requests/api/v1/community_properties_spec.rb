# frozen_string_literal: true

require 'rails_helper'

# Properties shares CommunityCategoryController with Artists (see
# community_artists_spec.rb for full shared-logic coverage) -- this is a
# basic CRUD smoke test for this category's own model/fields/sort.
RSpec.describe 'Community Properties' do
  let(:owner)   { Fabricate(:user).account }
  let(:token)   { Fabricate(:accessible_access_token, resource_owner_id: owner.user.id) }
  let(:headers) { { 'Authorization' => "Bearer #{token.token}" } }

  describe 'GET /api/v1/community_properties' do
    it 'sorts by title ascending when sort=az' do
      Fabricate(:community_property, title: 'Zzz Villa', status: :approved)
      Fabricate(:community_property, title: 'Aaa Villa', status: :approved)

      get '/api/v1/community_properties', params: { sort: 'az' }

      titles = response.parsed_body['entries'].map { |e| e['title'] }
      expect(titles).to eq(%w[Aaa\ Villa Zzz\ Villa])
    end
  end

  describe 'POST /api/v1/community_properties' do
    let(:valid_params) do
      { entry: { title: 'New Property', listing_type: 'rent', property_type: 'apartment',
                 town: 'Civezza', description: 'Desc' } }
    end

    it 'creates the entry as pending by default' do
      post '/api/v1/community_properties', headers: headers, params: valid_params

      expect(response).to have_http_status(201)
      expect(response.parsed_body['status']).to eq('pending')
    end
  end

  describe 'PATCH /api/v1/community_properties/:id' do
    let!(:entry) { Fabricate(:community_property, account: owner, status: :approved) }

    context 'when called by someone other than the owner' do
      let(:other)         { Fabricate(:user).account }
      let(:other_token)   { Fabricate(:accessible_access_token, resource_owner_id: other.user.id) }
      let(:other_headers) { { 'Authorization' => "Bearer #{other_token.token}" } }

      it 'is forbidden' do
        patch "/api/v1/community_properties/#{entry.id}", headers: other_headers,
                                                             params: { entry: { title: 'Hijacked' } }

        expect(response).to have_http_status(403)
      end
    end
  end

  describe 'DELETE /api/v1/community_properties/:id' do
    let!(:entry) { Fabricate(:community_property, account: owner, status: :approved) }

    it 'allows the owner to delete' do
      expect {
        delete "/api/v1/community_properties/#{entry.id}", headers: headers
      }.to change(CommunityProperty, :count).by(-1)

      expect(response).to have_http_status(204)
    end
  end
end
