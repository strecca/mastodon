# frozen_string_literal: true

# == Schema Information
#
# Table name: custom_emoji_categories
#
#  id                :bigint           not null, primary key
#  name              :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  featured_emoji_id :bigint
#
# Indexes
#
#  index_custom_emoji_categories_on_name  (name) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (featured_emoji_id => custom_emojis.id) ON DELETE => nullify
#
require 'rails_helper'

RSpec.describe CustomEmojiCategory do
  describe 'validations' do
    it { is_expected.to validate_presence_of(:name) }
  end
end
