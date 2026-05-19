# frozen_string_literal: true

# == Schema Information
#
# Table name: username_blocks
#
#  id                  :bigint           not null, primary key
#  allow_with_approval :boolean          default(FALSE), not null
#  exact               :boolean          default(FALSE), not null
#  normalized_username :string           not null
#  username            :string           not null
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#
# Indexes
#
#  index_username_blocks_on_normalized_username   (normalized_username)
#  index_username_blocks_on_username_lower_btree  (lower((username)::text)) UNIQUE
#
require 'rails_helper'

RSpec.describe UsernameBlock do
  describe '.matches?' do
    context 'when there is an exact block' do
      before do
        Fabricate(:username_block, username: 'carriage', exact: true)
      end

      it 'returns true on exact match' do
        expect(described_class.matches?('carriage')).to be true
      end

      it 'returns true on case insensitive match' do
        expect(described_class.matches?('CaRRiagE')).to be true
      end

      it 'returns true on homoglyph match' do
        expect(described_class.matches?('c4rr14g3')).to be true
      end

      it 'returns false on partial match' do
        expect(described_class.matches?('foo_carriage')).to be false
      end

      it 'returns false on no match' do
        expect(described_class.matches?('foo')).to be false
      end
    end

    context 'when there is a partial block' do
      before do
        Fabricate(:username_block, username: 'carriage', exact: false)
      end

      it 'returns true on exact match' do
        expect(described_class.matches?('carriage')).to be true
      end

      it 'returns true on case insensitive match' do
        expect(described_class.matches?('CaRRiagE')).to be true
      end

      it 'returns true on homoglyph match' do
        expect(described_class.matches?('c4rr14g3')).to be true
      end

      it 'returns true on suffix match' do
        expect(described_class.matches?('foo_carriage')).to be true
      end

      it 'returns true on prefix match' do
        expect(described_class.matches?('carriage_foo')).to be true
      end

      it 'returns false on no match' do
        expect(described_class.matches?('foo')).to be false
      end
    end
  end
end
