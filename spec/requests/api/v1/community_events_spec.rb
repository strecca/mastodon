# frozen_string_literal: true

require 'rails_helper'

# Events shares CommunityCategoryController with Artists (see
# community_artists_spec.rb for the full shared-logic coverage) -- this
# spec only exercises what's actually unique to Events: the different sort
# menu, the 2-photo cap, and a basic CRUD smoke test.
RSpec.describe 'Community Events' do
  let(:owner)   { Fabricate(:user).account }
  let(:token)   { Fabricate(:accessible_access_token, resource_owner_id: owner.user.id) }
  let(:headers) { { 'Authorization' => "Bearer #{token.token}" } }

  describe 'GET /api/v1/community_events' do
    it 'defaults to soonest-first (event_date ascending), not newest-created' do
      Fabricate(:community_event, event_name: 'Later', event_date: 2.weeks.from_now, status: :approved)
      Fabricate(:community_event, event_name: 'Sooner', event_date: 1.day.from_now, status: :approved)

      get '/api/v1/community_events'

      names = response.parsed_body['entries'].map { |e| e['event_name'] }
      expect(names).to eq(%w[Sooner Later])
    end

    it 'sorts by event_date descending when sort=past' do
      Fabricate(:community_event, event_name: 'OlderEvent', event_date: 2.weeks.ago, status: :approved)
      Fabricate(:community_event, event_name: 'NewerEvent', event_date: 1.day.ago, status: :approved)

      get '/api/v1/community_events', params: { sort: 'past' }

      names = response.parsed_body['entries'].map { |e| e['event_name'] }
      expect(names).to eq(%w[NewerEvent OlderEvent])
    end
  end

  describe 'POST /api/v1/community_events' do
    let(:valid_params) do
      { entry: { category: ['Music'], event_name: 'New Event', event_description: 'Desc',
                 location_town_city: 'Civezza', contact_info_1: 'a@b.com', event_date: 1.week.from_now } }
    end

    it 'creates the entry as pending by default' do
      post '/api/v1/community_events', headers: headers, params: valid_params

      expect(response).to have_http_status(201)
      expect(response.parsed_body['status']).to eq('pending')
    end

    # Confirms the 2-photo cap survives in the shared concern (default
    # elsewhere is 3) -- see max_media_ids override in the controller.
    it 'caps uploaded photos at 2, not the default 3' do
      media = Array.new(3) { Fabricate(:media_attachment, account: owner) }

      post '/api/v1/community_events', headers: headers,
                                        params: valid_params.merge(media_ids: media.map(&:id))

      expect(response.parsed_body['image_media_ids'].size).to eq(2)
    end
  end

  describe 'PATCH /api/v1/community_events/:id' do
    let!(:entry) { Fabricate(:community_event, account: owner, status: :approved) }

    context 'when called by someone other than the owner' do
      let(:other)         { Fabricate(:user).account }
      let(:other_token)   { Fabricate(:accessible_access_token, resource_owner_id: other.user.id) }
      let(:other_headers) { { 'Authorization' => "Bearer #{other_token.token}" } }

      it 'is forbidden' do
        patch "/api/v1/community_events/#{entry.id}", headers: other_headers,
                                                         params: { entry: { event_name: 'Hijacked' } }

        expect(response).to have_http_status(403)
      end
    end
  end

  describe 'DELETE /api/v1/community_events/:id' do
    let!(:entry) { Fabricate(:community_event, account: owner, status: :approved) }

    it 'allows the owner to delete' do
      expect {
        delete "/api/v1/community_events/#{entry.id}", headers: headers
      }.to change(CommunityEvent, :count).by(-1)

      expect(response).to have_http_status(204)
    end
  end
end
