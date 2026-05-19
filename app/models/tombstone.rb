# frozen_string_literal: true

# == Schema Information
#
# Table name: tombstones
#
#  id           :bigint           not null, primary key
#  by_moderator :boolean
#  uri          :string           not null
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  account_id   :bigint           not null
#
# Indexes
#
#  index_tombstones_on_account_id  (account_id)
#  index_tombstones_on_uri         (uri)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#

class Tombstone < ApplicationRecord
  belongs_to :account

  validates :uri, presence: true
end
