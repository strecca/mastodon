# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Member Welcome Digest' do
  let(:user)    { Fabricate(:user) }
  let(:token)   { Fabricate(:accessible_access_token, resource_owner_id: user.id) }
  let(:headers) { { 'Authorization' => "Bearer #{token.token}" } }

  describe 'GET /api/v1/member_welcome_digest' do
    subject { get '/api/v1/member_welcome_digest', headers: headers }

    context "when today's digest has content" do
      before { Fabricate(:member_welcome_digest, account: user.account, digest_date: Date.current, content: 'Hi there!') }

      it 'returns state available with the content' do
        subject

        expect(response.parsed_body['state']).to eq('available')
        expect(response.parsed_body['content']).to eq('Hi there!')
      end
    end

    context "when today's digest exists but has no content" do
      before { Fabricate(:member_welcome_digest, account: user.account, digest_date: Date.current, content: nil) }

      it 'returns state none' do
        subject

        expect(response.parsed_body['state']).to eq('none')
      end
    end

    context 'when no digest row exists and nothing is running' do
      it 'returns state none' do
        subject

        expect(response.parsed_body['state']).to eq('none')
      end
    end

    context 'when a digest is currently being generated' do
      before { AsyncRefresh.create("welcome_digest:#{user.account.id}:#{Date.current}") }

      it 'returns state generating and the async refresh header' do
        subject

        expect(response.parsed_body['state']).to eq('generating')
        expect(response.headers['Mastodon-Async-Refresh']).to be_present
      end
    end

    context "when another account's digest exists for today" do
      before { Fabricate(:member_welcome_digest, digest_date: Date.current, content: 'Not yours') }

      it 'does not return it' do
        subject

        expect(response.parsed_body['state']).to eq('none')
      end
    end
  end

  describe 'POST /api/v1/member_welcome_digest/read' do
    subject { post '/api/v1/member_welcome_digest/read', headers: headers }

    context "when today's digest exists" do
      let!(:digest) { Fabricate(:member_welcome_digest, account: user.account, digest_date: Date.current) }

      it 'marks it viewed' do
        expect { subject }.to change { digest.reload.viewed_at }.from(nil)
      end
    end

    context 'when no digest exists for today' do
      it 'does not raise' do
        subject

        expect(response).to have_http_status(:ok)
      end
    end
  end
end
