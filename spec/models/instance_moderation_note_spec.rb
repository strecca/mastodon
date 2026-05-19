# frozen_string_literal: true

# == Schema Information
#
# Table name: instance_moderation_notes
#
#  id         :bigint           not null, primary key
#  content    :text
#  domain     :string           not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#
# Indexes
#
#  index_instance_moderation_notes_on_domain  (domain)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe InstanceModerationNote do
  describe 'chronological' do
    it 'returns the instance notes sorted by oldest first' do
      instance = Instance.find_or_initialize_by(domain: 'mastodon.example')

      note1 = Fabricate(:instance_moderation_note, domain: instance.domain)
      note2 = Fabricate(:instance_moderation_note, domain: instance.domain)

      expect(instance.moderation_notes.chronological).to eq [note1, note2]
    end
  end

  describe 'Validations' do
    subject { Fabricate.build :instance_moderation_note }

    it { is_expected.to allow_value('non-existent.example').for(:domain) }
    it { is_expected.to validate_length_of(:content).is_at_most(described_class::CONTENT_SIZE_LIMIT) }
    it { is_expected.to validate_presence_of(:content) }
    it { is_expected.to validate_presence_of(:domain) }
  end
end
