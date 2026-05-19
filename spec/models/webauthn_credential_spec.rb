# frozen_string_literal: true

# == Schema Information
#
# Table name: webauthn_credentials
#
#  id          :bigint           not null, primary key
#  nickname    :string           not null
#  public_key  :string           not null
#  sign_count  :bigint           default(0), not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  external_id :string           not null
#  user_id     :bigint
#
# Indexes
#
#  index_webauthn_credentials_on_external_id           (external_id) UNIQUE
#  index_webauthn_credentials_on_user_id_and_nickname  (user_id,nickname) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe WebauthnCredential do
  describe 'Validations' do
    subject { Fabricate.build :webauthn_credential }

    it { is_expected.to validate_presence_of(:external_id) }
    it { is_expected.to validate_presence_of(:public_key) }
    it { is_expected.to validate_presence_of(:nickname) }
    it { is_expected.to validate_presence_of(:sign_count) }

    it { is_expected.to validate_uniqueness_of(:external_id) }
    it { is_expected.to validate_uniqueness_of(:nickname).scoped_to(:user_id) }

    it { is_expected.to validate_numericality_of(:sign_count).only_integer.is_greater_than_or_equal_to(0).is_less_than(described_class::SIGN_COUNT_LIMIT) }
  end
end
