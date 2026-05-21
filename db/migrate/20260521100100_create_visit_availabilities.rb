# frozen_string_literal: true

class CreateVisitAvailabilities < ActiveRecord::Migration[7.2]
  def change
    create_table :visit_availabilities do |t|
      t.references :community_visit, null: false, foreign_key: true

      # 0=coffee 1=dinner 2=hike 3=excursion 4=introduction 5=open_house
      t.integer :kind, null: false

      t.timestamps
    end

    # A visit can only have each availability kind once
    add_index :visit_availabilities, %i[community_visit_id kind],
              unique: true,
              name: 'idx_visit_availabilities_unique'
  end
end
