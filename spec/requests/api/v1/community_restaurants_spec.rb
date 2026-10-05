# frozen_string_literal: true

require 'rails_helper'

# Restaurants shares CommunityCategoryController with Artists (see
# community_artists_spec.rb for full shared-logic coverage) -- this is a
# basic CRUD smoke test for this category's own model/fields/sort.
RSpec.describe 'Community Restaurants' do
  let(:owner)   { Fabricate(:user).account }
  let(:token)   { Fabricate(:accessible_access_token, resource_owner_id: owner.user.id) }
  let(:headers) { { 'Authorization' => "Bearer #{token.token}" } }

  describe 'GET /api/v1/community_restaurants' do
    it 'sorts by name ascending when sort=az' do
      Fabricate(:community_restaurant, name: 'Zzz Trattoria', status: :approved)
      Fabricate(:community_restaurant, name: 'Aaa Trattoria', status: :approved)

      get '/api/v1/community_restaurants', params: { sort: 'az' }

      names = response.parsed_body['entries'].map { |e| e['name'] }
      expect(names).to eq(['Aaa Trattoria', 'Zzz Trattoria'])
    end
  end

  describe 'POST /api/v1/community_restaurants' do
    let(:valid_params) do
      { entry: { name: 'New Restaurant', cuisine_type: ['Italian'], town: 'Civezza' } }
    end

    it 'creates the entry as pending by default' do
      post '/api/v1/community_restaurants', headers: headers, params: valid_params

      expect(response).to have_http_status(201)
      expect(response.parsed_body['status']).to eq('pending')
    end

    it 'accepts cuisine_type as an array' do
      post '/api/v1/community_restaurants', headers: headers, params: valid_params

      expect(response.parsed_body['cuisine_type']).to eq(['Italian'])
    end
  end

  describe 'PATCH /api/v1/community_restaurants/:id' do
    let!(:entry) { Fabricate(:community_restaurant, account: owner, status: :approved) }

    context 'when called by someone other than the owner' do
      let(:other)         { Fabricate(:user).account }
      let(:other_token)   { Fabricate(:accessible_access_token, resource_owner_id: other.user.id) }
      let(:other_headers) { { 'Authorization' => "Bearer #{other_token.token}" } }

      it 'is forbidden' do
        patch "/api/v1/community_restaurants/#{entry.id}", headers: other_headers,
                                                               params: { entry: { name: 'Hijacked' } }

        expect(response).to have_http_status(403)
      end
    end
  end

  describe 'DELETE /api/v1/community_restaurants/:id' do
    let!(:entry) { Fabricate(:community_restaurant, account: owner, status: :approved) }

    it 'allows the owner to delete' do
      expect {
        delete "/api/v1/community_restaurants/#{entry.id}", headers: headers
      }.to change(CommunityRestaurant, :count).by(-1)

      expect(response).to have_http_status(204)
    end
  end
end
