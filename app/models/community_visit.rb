# frozen_string_literal: true

# == Schema Information
#
# Table name: community_visits
#
#  id                   :bigint           not null, primary key
#  arrival_date         :date             not null
#  departure_date       :date             not null
#  note                 :text
#  visibility           :integer          default("public_to_members"), not null
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  account_id           :bigint           not null
#  community_profile_id :bigint
#
# Indexes
#
#  idx_community_visits_date_range       (arrival_date,departure_date)
#  idx_community_visits_departure        (departure_date)
#  idx_community_visits_visibility       (visibility)
#  index_community_visits_on_account_id  (account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#
class CommunityVisit < ApplicationRecord
  belongs_to :account
  has_many :visit_availabilities, dependent: :destroy
  has_many :visit_notifications, class_name: 'CommunityVisitNotification',
           foreign_key: :community_visit_id, dependent: :destroy

  enum :visibility, { public_to_members: 0, connections_only: 1, ghost: 2, my_people: 3 }, default: :public_to_members

  validates :arrival_date,   presence: true
  validates :departure_date, presence: true
  validate  :departure_on_or_after_arrival

  # ── Scopes ────────────────────────────────────────────────────────────────

  # Visits whose dates overlap [from..to] — the core calendar query
  scope :overlapping, ->(from, to) {
    where('arrival_date <= ? AND departure_date >= ?', to, from)
  }

  scope :upcoming,          -> { where('departure_date >= ?', Date.current) }
  scope :past,              -> { where('departure_date < ?',  Date.current) }
  scope :visible_to_members, -> { where.not(visibility: :ghost) }
  scope :for_account,       ->(account) { where(account: account) }

  # ── Helpers ───────────────────────────────────────────────────────────────

  def active?
    arrival_date <= Date.current && departure_date >= Date.current
  end

  def duration_days
    (departure_date - arrival_date).to_i + 1
  end

  private

  def departure_on_or_after_arrival
    return unless arrival_date && departure_date
    errors.add(:departure_date, 'must be on or after arrival date') if departure_date < arrival_date
  end
end
