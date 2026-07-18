# frozen_string_literal: true

class AddFilePathToNewsletterAssets < ActiveRecord::Migration[7.2]
  def change
    add_column :newsletter_assets, :file_path, :string
  end
end
