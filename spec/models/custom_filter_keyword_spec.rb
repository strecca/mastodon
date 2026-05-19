# frozen_string_literal: true

# == Schema Information
#
# Table name: custom_filter_keywords
#
#  id               :bigint           not null, primary key
#  keyword          :text             default(""), not null
#  whole_word       :boolean          default(TRUE), not null
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  custom_filter_id :bigint           not null
#
# Indexes
#
#  index_custom_filter_keywords_on_custom_filter_id  (custom_filter_id)
#
# Foreign Keys
#
#  fk_rails_...  (custom_filter_id => custom_filters.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe CustomFilterKeyword do
  describe 'Validations' do
    it { is_expected.to validate_length_of(:keyword).is_at_most(described_class::KEYWORD_LENGTH_LIMIT) }
    it { is_expected.to validate_presence_of(:keyword) }
  end

  describe '#to_regex' do
    context 'when whole_word is true' do
      it 'builds a regex with boundaries and the keyword' do
        keyword = described_class.new(whole_word: true, keyword: 'test')

        expect(keyword.to_regex).to eq(/(?mix:\b#{Regexp.escape(keyword.keyword)}\b)/)
      end

      it 'builds a regex with starting boundary and the keyword when end with non-word' do
        keyword = described_class.new(whole_word: true, keyword: 'test#')

        expect(keyword.to_regex).to eq(/(?mix:\btest\#)/)
      end

      it 'builds a regex with end boundary and the keyword when start with non-word' do
        keyword = described_class.new(whole_word: true, keyword: '#test')

        expect(keyword.to_regex).to eq(/(?mix:\#test\b)/)
      end
    end

    context 'when whole_word is false' do
      it 'builds a regex with the keyword' do
        keyword = described_class.new(whole_word: false, keyword: 'test')

        expect(keyword.to_regex).to eq(/test/i)
      end
    end
  end
end
