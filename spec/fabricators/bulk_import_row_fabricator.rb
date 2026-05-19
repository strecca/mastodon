# frozen_string_literal: true

# == Schema Information
#
# Table name: bulk_import_rows
#
#  id             :bigint           not null, primary key
#  data           :jsonb
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  bulk_import_id :bigint           not null
#
# Indexes
#
#  index_bulk_import_rows_on_bulk_import_id  (bulk_import_id)
#
# Foreign Keys
#
#  fk_rails_...  (bulk_import_id => bulk_imports.id) ON DELETE => cascade
#
Fabricator(:bulk_import_row) do
  bulk_import { Fabricate.build(:bulk_import) }
  data ''
end
