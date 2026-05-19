# frozen_string_literal: true

# == Schema Information
#
# Table name: bulk_imports
#
#  id                :bigint           not null, primary key
#  finished_at       :datetime
#  imported_items    :integer          default(0), not null
#  likely_mismatched :boolean          default(FALSE), not null
#  original_filename :string           default(""), not null
#  overwrite         :boolean          default(FALSE), not null
#  processed_items   :integer          default(0), not null
#  state             :integer          not null
#  total_items       :integer          default(0), not null
#  type              :integer          not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint           not null
#
# Indexes
#
#  index_bulk_imports_on_account_id  (account_id)
#  index_bulk_imports_unconfirmed    (id) WHERE (state = 0)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:bulk_import) do
  type            1
  state           1
  total_items     1
  processed_items 1
  imported_items  1
  finished_at     '2022-11-18 14:55:07'
  overwrite       false
  account { Fabricate.build(:account) }
end
