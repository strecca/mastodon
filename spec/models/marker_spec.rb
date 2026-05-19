# frozen_string_literal: true

# == Schema Information
#
# Table name: markers
#
#  id           :bigint           not null, primary key
#  lock_version :integer          default(0), not null
#  timeline     :string           default(""), not null
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  last_read_id :bigint           default(0), not null
#  user_id      :bigint           not null
#
# Indexes
#
#  index_markers_on_user_id_and_timeline  (user_id,timeline) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe Marker do
  describe 'Validations' do
    it { is_expected.to validate_inclusion_of(:timeline).in_array(described_class::TIMELINES) }
  end
end
