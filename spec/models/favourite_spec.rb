# frozen_string_literal: true

# == Schema Information
#
# Table name: favourites
#
#  id         :bigint           not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#  status_id  :bigint           not null
#
# Indexes
#
#  index_favourites_on_account_id_and_id         (account_id,id)
#  index_favourites_on_account_id_and_status_id  (account_id,status_id) UNIQUE
#  index_favourites_on_status_id                 (status_id)
#
# Foreign Keys
#
#  fk_5eb6c2b873  (account_id => accounts.id) ON DELETE => cascade
#  fk_b0e856845e  (status_id => statuses.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe Favourite do
  let(:account) { Fabricate(:account) }

  context 'when status is a reblog' do
    let(:reblog) { Fabricate(:status, reblog: nil) }
    let(:status) { Fabricate(:status, reblog: reblog) }

    it 'invalidates if the reblogged status is already a favourite' do
      described_class.create!(account: account, status: reblog)
      expect(described_class.new(account: account, status: status).valid?).to be false
    end

    it 'replaces status with the reblogged one if it is a reblog' do
      favourite = described_class.create!(account: account, status: status)
      expect(favourite.status).to eq reblog
    end
  end

  context 'when status is not a reblog' do
    let(:status) { Fabricate(:status, reblog: nil) }

    it 'saves with the specified status' do
      favourite = described_class.create!(account: account, status: status)
      expect(favourite.status).to eq status
    end
  end
end
