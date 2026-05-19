# frozen_string_literal: true

# == Schema Information
#
# Table name: account_warning_presets
#
#  id         :bigint           not null, primary key
#  text       :text             default(""), not null
#  title      :string           default(""), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
require 'rails_helper'

RSpec.describe AccountWarningPreset do
  describe 'alphabetical' do
    let(:first) { Fabricate(:account_warning_preset, title: 'aaa', text: 'aaa') }
    let(:second) { Fabricate(:account_warning_preset, title: 'bbb', text: 'aaa') }
    let(:third) { Fabricate(:account_warning_preset, title: 'bbb', text: 'bbb') }

    it 'returns records in order of title and text' do
      results = described_class.alphabetic

      expect(results).to eq([first, second, third])
    end
  end
end
