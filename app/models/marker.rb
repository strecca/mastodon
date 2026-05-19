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

class Marker < ApplicationRecord
  TIMELINES = %w(home notifications).freeze

  belongs_to :user

  validates :timeline, :last_read_id, presence: true
  validates :timeline, inclusion: { in: TIMELINES }
end
