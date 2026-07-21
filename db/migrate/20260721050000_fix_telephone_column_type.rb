# frozen_string_literal: true

# telephone was a 4-byte Postgres integer on these two generated categories,
# which overflows on a full phone number with country code (e.g.
# 393331112233). Every other category's phone-like field (CommunityService
# #phone, CommunityRestaurant#phone, CommunityProperty#phone) is a plain
# string column -- conforming telephone to that same type here.
class FixTelephoneColumnType < ActiveRecord::Migration[7.2]
  def up
    change_column :community_artists, :telephone, :string
    change_column :community_events, :telephone, :string
  end

  def down
    change_column :community_artists, :telephone, :integer, using: 'telephone::integer'
    change_column :community_events, :telephone, :integer, using: 'telephone::integer'
  end
end
