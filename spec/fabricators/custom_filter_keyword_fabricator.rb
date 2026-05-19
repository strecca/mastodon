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
Fabricator(:custom_filter_keyword) do
  custom_filter { Fabricate.build(:custom_filter) }
  keyword 'discourse'
end
