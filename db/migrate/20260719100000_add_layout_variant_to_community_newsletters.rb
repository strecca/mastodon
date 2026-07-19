# frozen_string_literal: true

class AddLayoutVariantToCommunityNewsletters < ActiveRecord::Migration[7.2]
  def change
    add_column :community_newsletters, :layout_variant, :string, default: 'gazette', null: false
  end
end
