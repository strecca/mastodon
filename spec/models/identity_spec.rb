# frozen_string_literal: true

# == Schema Information
#
# Table name: identities
#
#  id         :bigint           not null, primary key
#  provider   :string           default(""), not null
#  uid        :string           default(""), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :bigint
#
# Indexes
#
#  index_identities_on_uid_and_provider  (uid,provider) UNIQUE
#  index_identities_on_user_id           (user_id)
#
# Foreign Keys
#
#  fk_bea040f377  (user_id => users.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe Identity do
  describe '.find_for_omniauth' do
    let(:auth) { Fabricate(:identity, user: Fabricate(:user)) }

    it 'calls .find_or_create_by' do
      allow(described_class).to receive(:find_or_create_by)

      described_class.find_for_omniauth(auth)

      expect(described_class).to have_received(:find_or_create_by).with(uid: auth.uid, provider: auth.provider)
    end

    it 'returns an instance of Identity' do
      expect(described_class.find_for_omniauth(auth)).to be_instance_of described_class
    end
  end
end
