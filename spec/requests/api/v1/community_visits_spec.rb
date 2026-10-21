# frozen_string_literal: true

require 'rails_helper'

# Written 2026-10-21. Visit names/dates ("When I'll Be In Town") are
# members-only by David's decision; only the anonymous per-month counts in
# #heatmap are public, for the signed-out teaser. Until this date the heatmap
# silently 401'd for signed-out visitors because Api::BaseController's
# require_authenticated_user! was never skipped for it -- these specs pin
# both halves of the rule.
RSpec.describe 'Community Visits' do
  let(:member)  { Fabricate(:user).account }
  let(:token)   { Fabricate(:accessible_access_token, resource_owner_id: member.user.id, scopes: 'read write') }
  let(:headers) { { 'Authorization' => "Bearer #{token.token}" } }

  before do
    CommunityVisit.create!(
      account: Fabricate(:account),
      arrival_date: Date.current + 3,
      departure_date: Date.current + 10,
      visibility: :public_to_members
    )
  end

  describe 'GET /api/v1/community_visits/heatmap' do
    # Production runs LIMITED_FEDERATION_MODE, which makes Api::BaseController
    # require auth for every action unless it's explicitly skipped. The test
    # env doesn't, so simulate it with the equivalent per-request switch.
    around do |example|
      ClimateControl.modify(DISALLOW_UNAUTHENTICATED_API_ACCESS: 'true') { example.run }
    end

    it 'succeeds without authentication and returns only per-month counts' do
      get '/api/v1/community_visits/heatmap'

      expect(response).to have_http_status(200)
      expect(response.parsed_body).to be_a(Hash)
      expect(response.parsed_body.values).to all(be_a(Integer))
      expect(response.parsed_body.values.sum).to eq(1)
    end
  end

  describe 'GET /api/v1/community_visits' do
    it 'refuses signed-out visitors' do
      get '/api/v1/community_visits'

      expect(response).to have_http_status(401).or have_http_status(422)
    end

    it 'returns public visits to a signed-in member' do
      get '/api/v1/community_visits', headers: headers

      expect(response).to have_http_status(200)
      expect(response.parsed_body.size).to eq(1)
    end
  end
end
