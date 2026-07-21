# frozen_string_literal: true

# telephone was a 4-byte Postgres integer on these two generated categories,
# which overflows on a full phone number with country code (e.g.
# 393331112233). Every other category's phone-like field (CommunityService
# #phone, CommunityRestaurant#phone, CommunityProperty#phone) is a plain
# string column -- conforming telephone to that same type here.
class FixTelephoneColumnType < ActiveRecord::Migration[7.2]
  def up
    safety_assured do
      # community_artists/community_events are small community-content
      # tables (tens of rows), not user-facing Mastodon core tables --
      # the table-rewrite/lock strong_migrations warns about is
      # negligible at this scale.
      change_column :community_artists, :telephone, :string
      change_column :community_events, :telephone, :string
    end
  end

  def down
    safety_assured do
      change_column :community_artists, :telephone, :integer, using: 'telephone::integer'
      change_column :community_events, :telephone, :integer, using: 'telephone::integer'
    end
  end
end
