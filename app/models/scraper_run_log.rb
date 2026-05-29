# frozen_string_literal: true

class ScraperRunLog < ApplicationRecord
  validates :source_name, :ran_at, :status, presence: true

  scope :recent, -> { order(ran_at: :desc) }

  def self.latest_per_source
    sources = distinct.pluck(:source_name)
    sources.filter_map { |s| where(source_name: s).recent.first }
           .sort_by(&:source_name)
  end
end
