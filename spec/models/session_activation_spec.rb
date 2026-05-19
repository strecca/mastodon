# frozen_string_literal: true

# == Schema Information
#
# Table name: session_activations
#
#  id                       :bigint           not null, primary key
#  ip                       :inet
#  user_agent               :string           default(""), not null
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#  access_token_id          :bigint
#  session_id               :string           not null
#  user_id                  :bigint           not null
#  web_push_subscription_id :bigint
#
# Indexes
#
#  index_session_activations_on_access_token_id  (access_token_id)
#  index_session_activations_on_session_id       (session_id) UNIQUE
#  index_session_activations_on_user_id          (user_id)
#
# Foreign Keys
#
#  fk_957e5bda89  (access_token_id => oauth_access_tokens.id) ON DELETE => cascade
#  fk_e5fda67334  (user_id => users.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe SessionActivation do
  it_behaves_like 'BrowserDetection'

  describe '.active?' do
    subject { described_class.active?(id) }

    context 'when id is absent' do
      let(:id) { nil }

      it 'returns nil' do
        expect(subject).to be_nil
      end
    end

    context 'when id is present' do
      let(:id) { '1' }
      let!(:session_activation) { Fabricate(:session_activation, session_id: id) }

      context 'when id exists as session_id' do
        it 'returns true' do
          expect(subject).to be true
        end
      end

      context 'when id does not exist as session_id' do
        before do
          session_activation.update!(session_id: '2')
        end

        it 'returns false' do
          expect(subject).to be false
        end
      end
    end
  end

  describe '.activate' do
    let(:user) { Fabricate :user }
    let!(:session_activation) { Fabricate :session_activation, user: }

    around do |example|
      original = Rails.configuration.x.max_session_activations
      Rails.configuration.x.max_session_activations = 1
      example.run
      Rails.configuration.x.max_session_activations = original
    end

    it 'creates a new activation and purges older ones' do
      result = described_class.activate(user: user, session_id: '123')

      expect(result)
        .to be_a(described_class)
        .and have_attributes(session_id: '123', user:)
      expect { session_activation.reload }
        .to raise_error(ActiveRecord::RecordNotFound)
    end
  end

  describe '.deactivate' do
    context 'when id is absent' do
      let(:id) { nil }

      it 'returns nil' do
        expect(described_class.deactivate(id)).to be_nil
      end
    end

    context 'when id exists' do
      let!(:session_activation) { Fabricate(:session_activation) }

      it 'destroys the record' do
        described_class.deactivate(session_activation.session_id)

        expect { session_activation.reload }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end
  end

  describe '.purge_old' do
    around do |example|
      before = Rails.configuration.x.max_session_activations
      Rails.configuration.x.max_session_activations = 1
      example.run
      Rails.configuration.x.max_session_activations = before
    end

    let!(:oldest_session_activation) { Fabricate(:session_activation, created_at: 10.days.ago) }
    let!(:newest_session_activation) { Fabricate(:session_activation, created_at: 5.days.ago) }

    it 'preserves the newest X records based on config' do
      described_class.purge_old

      expect { oldest_session_activation.reload }.to raise_error(ActiveRecord::RecordNotFound)
      expect { newest_session_activation.reload }.to_not raise_error
    end
  end

  describe '.exclusive' do
    let!(:unwanted_session_activation) { Fabricate(:session_activation) }
    let!(:wanted_session_activation) { Fabricate(:session_activation) }

    it 'preserves supplied record and destroys all others' do
      described_class.exclusive(wanted_session_activation.session_id)

      expect { unwanted_session_activation.reload }.to raise_error(ActiveRecord::RecordNotFound)
      expect { wanted_session_activation.reload }.to_not raise_error
    end
  end
end
