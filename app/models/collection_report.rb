# frozen_string_literal: true

# == Schema Information
#
# Table name: collection_reports
#
#  id            :bigint           not null, primary key
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  collection_id :bigint           not null
#  report_id     :bigint           not null
#
# Indexes
#
#  index_collection_reports_on_collection_id  (collection_id)
#  index_collection_reports_on_report_id      (report_id)
#
# Foreign Keys
#
#  fk_rails_...  (collection_id => collections.id) ON DELETE => cascade
#  fk_rails_...  (report_id => reports.id) ON DELETE => cascade
#
class CollectionReport < ApplicationRecord
  belongs_to :collection
  belongs_to :report
end
