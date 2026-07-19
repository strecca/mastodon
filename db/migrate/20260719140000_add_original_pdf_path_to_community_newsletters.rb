# frozen_string_literal: true

class AddOriginalPdfPathToCommunityNewsletters < ActiveRecord::Migration[7.2]
  def change
    add_column :community_newsletters, :original_pdf_path, :string
  end
end
