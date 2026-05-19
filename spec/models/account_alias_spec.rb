# frozen_string_literal: true

# == Schema Information
#
# Table name: account_aliases
#
#  id         :bigint           not null, primary key
#  acct       :string           default(""), not null
#  uri        :string           default(""), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#
# Indexes
#
#  index_account_aliases_on_account_id_and_uri  (account_id,uri) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe AccountAlias do
  describe 'Normalizations' do
    describe 'acct' do
      it { is_expected.to normalize(:acct).from('  @username@domain  ').to('username@domain') }
    end
  end

  describe 'Validations' do
    subject { described_class.new(account:) }

    let(:account) { Fabricate :account }

    it { is_expected.to_not allow_values(nil, '').for(:uri).against(:acct).with_message(not_found_message) }

    it { is_expected.to_not allow_values(account_uri).for(:uri).against(:acct).with_message(self_move_message) }

    def account_uri
      ActivityPub::TagManager.instance.uri_for(subject.account)
    end

    def not_found_message
      I18n.t('migrations.errors.not_found')
    end

    def self_move_message
      I18n.t('migrations.errors.move_to_self')
    end
  end
end
