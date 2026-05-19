# frozen_string_literal: true

# == Schema Information
#
# Table name: collection_items
#
#  id                        :bigint           not null, primary key
#  activity_uri              :string
#  approval_last_verified_at :datetime
#  approval_uri              :string
#  object_uri                :string
#  position                  :integer          default(1), not null
#  state                     :integer          default("pending"), not null
#  uri                       :string
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  account_id                :bigint
#  collection_id             :bigint           not null
#
# Indexes
#
#  index_collection_items_on_account_id_and_collection_id  (account_id,collection_id) UNIQUE
#  index_collection_items_on_approval_uri                  (approval_uri) UNIQUE WHERE (approval_uri IS NOT NULL)
#  index_collection_items_on_collection_id                 (collection_id)
#  index_collection_items_on_uri                           (uri) UNIQUE WHERE (uri IS NOT NULL)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#  fk_rails_...  (collection_id => collections.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe CollectionItem do
  describe 'Validations' do
    subject { Fabricate.build(:collection_item) }

    it { is_expected.to define_enum_for(:state) }

    it { is_expected.to validate_numericality_of(:position).only_integer.is_greater_than(0) }

    context 'when account inclusion is accepted' do
      subject { Fabricate.build(:collection_item, state: :accepted) }

      it { is_expected.to validate_presence_of(:account) }
    end

    context 'when item is not local' do
      subject { Fabricate.build(:collection_item, collection: remote_collection, account:) }

      let(:account) { Fabricate.build(:remote_account) }
      let(:remote_collection) { Fabricate.build(:collection, local: false) }

      it { is_expected.to validate_presence_of(:uri) }

      context 'when account is not present' do
        subject { Fabricate.build(:collection_item, collection: remote_collection, account: nil) }

        it { is_expected.to validate_presence_of(:approval_uri) }
      end

      context 'when account is local' do
        let(:account) { Fabricate.build(:account) }

        it { is_expected.to_not validate_presence_of(:uri) }
      end
    end

    context 'when account is not present' do
      subject { Fabricate.build(:unverified_remote_collection_item) }

      it { is_expected.to validate_presence_of(:object_uri) }
    end
  end

  describe 'Creation' do
    let(:collection) { Fabricate(:collection) }
    let(:other_collection) { Fabricate(:collection) }
    let(:account) { Fabricate(:account) }
    let(:other_account) { Fabricate(:account) }

    it 'automatically sets the `position` if absent' do
      first_item = collection.collection_items.create(account:)
      second_item = collection.collection_items.create(account: other_account)
      unrelated_item = other_collection.collection_items.create(account:)
      custom_item = other_collection.collection_items.create(account: other_account, position: 7)

      expect(first_item.position).to eq 1
      expect(second_item.position).to eq 2
      expect(unrelated_item.position).to eq 1
      expect(custom_item.position).to eq 7
    end

    it 'automatically sets the position if excplicitly set to `nil`' do
      item = collection.collection_items.create!(account:, position: nil)

      expect(item.position).to eq 1
    end

    it 'automatically sets `activity_uri` when account is remote' do
      item = collection.collection_items.create(account: Fabricate(:remote_account))

      expect(item.activity_uri).to be_present
    end
  end
end
