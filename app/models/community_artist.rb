# == Schema Information
#
# Table name: community_artists
#
#  id                 :bigint           not null, primary key
#  artist_description :text
#  category           :jsonb            not null
#  contact_info_1     :string           not null
#  contact_info_2     :string
#  first_name         :string           not null
#  hours_schedule     :string
#  last_name          :string           not null
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
#  index_community_artists_on_account_id          (account_id)
#  index_community_artists_on_category            (category) USING gin
#  index_community_artists_on_created_at          (created_at)
#  index_community_artists_on_last_name           (last_name)
#  index_community_artists_on_location_town_city  (location_town_city)
#  index_community_artists_on_status              (status)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id)
#
class CommunityArtist < ApplicationRecord
  belongs_to :account
  has_many :entry_translations, class_name: 'CommunityEntryTranslation',
           as: :translatable, dependent: :destroy

  enum :status, { pending: 0, approved: 1, rejected: 2 }, default: :pending

  validates :category, presence: true
  validates :location_town_city, presence: true
  validates :first_name, presence: true
  validates :last_name, presence: true
  validates :artist_description, presence: true
  validates :contact_info_1, presence: true
  scope :search, ->(query) {
    return all if query.blank?
    cols = "lower(coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(location_town_city,'') || ' ' || coalesce(artist_description,''))"
    where("#{cols} LIKE ?", "%#{query.downcase}%")
  }
end
