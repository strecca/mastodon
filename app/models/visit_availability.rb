# frozen_string_literal: true

# == Schema Information
#
# Table name: visit_availabilities
#
#  id                 :bigint           not null, primary key
#  kind               :integer          not null
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  community_visit_id :bigint           not null
#
# Indexes
#
#  idx_visit_availabilities_unique                   (community_visit_id,kind) UNIQUE
#  index_visit_availabilities_on_community_visit_id  (community_visit_id)
#
# Foreign Keys
#
#  fk_rails_...  (community_visit_id => community_visits.id)
#
class VisitAvailability < ApplicationRecord
  belongs_to :community_visit

  enum :kind, {
    coffee:       0,
    dinner:       1,
    hike:         2,
    excursion:    3,
    introduction: 4,
    open_house:   5,
  }

  validates :kind, presence: true
  validates :community_visit_id, uniqueness: { scope: :kind }
end
