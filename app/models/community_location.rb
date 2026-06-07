# frozen_string_literal: true

class CommunityLocation < ApplicationRecord
  validates :name, presence: true, uniqueness: { case_sensitive: false }

  scope :active,   -> { where(active: true) }
  scope :ordered,  -> { order(:sort_order, :name) }

  def self.active_names
    active.ordered.pluck(:name)
  end
end
