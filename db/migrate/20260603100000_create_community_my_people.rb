# frozen_string_literal: true

class CreateCommunityMyPeople < ActiveRecord::Migration[7.2]
  def change
    create_table :community_my_people do |t|
      t.references :account,        null: false, foreign_key: true
      t.references :member_account, null: false, foreign_key: { to_table: :accounts }
      t.timestamps
    end

    add_index :community_my_people, [:account_id, :member_account_id], unique: true, name: 'idx_community_my_people_unique'
  end
end
