# == Schema Information
#
# Table name: community_events
#
#  id                 :bigint           not null, primary key
#  category           :jsonb            not null
#  contact_info_1     :string           not null
#  contact_info_2     :string
#  event_date         :datetime         not null
#  event_description  :text
#  event_name         :string           not null
#  location_town_city :string           not null
#  status             :integer          default("pending"), not null
#  telephone          :integer
#  website            :string
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  account_id         :bigint           not null
#
# Indexes
#
#  index_community_events_on_account_id          (account_id)
#  index_community_events_on_category            (category) USING gin
#  index_community_events_on_created_at          (created_at)
#  index_community_events_on_event_date          (event_date)
#  index_community_events_on_location_town_city  (location_town_city)
#  index_community_events_on_status              (status)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#
class CommunityEvent < ApplicationRecord
  belongs_to :account
  has_many :entry_translations, class_name: 'CommunityEntryTranslation',
           as: :translatable, dependent: :destroy

  enum :status, { pending: 0, approved: 1, rejected: 2 }, default: :pending

  validates :category, presence: true
  validates :event_name, presence: true
  validates :event_description, presence: true
  validates :location_town_city, presence: true
  validates :contact_info_1, presence: true, unless: :auto_imported?
  validates :event_date, presence: true

  scope :search, ->(query) {
    return all if query.blank?
    cols = "coalesce(event_name, '') || ' ' || coalesce(location_town_city, '') || ' ' || coalesce(event_description, '')"
    where("to_tsvector('english', #{cols}) @@ plainto_tsquery('english', ?)", query)
  }
end
