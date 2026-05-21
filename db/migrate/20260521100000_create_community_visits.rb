# frozen_string_literal: true

class CreateCommunityVisits < ActiveRecord::Migration[7.2]
  def change
    create_table :community_visits do |t|
      t.references :account, null: false, foreign_key: true
      # Nullable until /community_members is built — wired up then
      t.bigint     :community_profile_id

      t.date    :arrival_date,  null: false
      t.date    :departure_date, null: false

      # 0 = public_to_members, 1 = connections_only, 2 = ghost
      t.integer :visibility, null: false, default: 0

      t.text    :note

      t.timestamps
    end

    # Calendar overlap query: arrival_date <= range_end AND departure_date >= range_start
    add_index :community_visits, %i[arrival_date departure_date],
              name: 'idx_community_visits_date_range'

    # Fast filter of past visits (departure_date < today)
    add_index :community_visits, :departure_date,
              name: 'idx_community_visits_departure'

    add_index :community_visits, :visibility,
              name: 'idx_community_visits_visibility'

    # Enforce chronological order at the DB level
    add_check_constraint :community_visits,
                         'departure_date >= arrival_date',
                         name: 'chk_community_visits_date_order'
  end
end
