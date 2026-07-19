# frozen_string_literal: true

class AddDesignTokensToCommunityNewsletters < ActiveRecord::Migration[7.2]
  def change
    add_column :community_newsletters, :design_tokens, :jsonb
  end
end
