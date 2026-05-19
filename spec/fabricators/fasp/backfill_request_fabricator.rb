# frozen_string_literal: true

# == Schema Information
#
# Table name: fasp_backfill_requests
#
#  id               :bigint           not null, primary key
#  category         :string           not null
#  cursor           :string
#  fulfilled        :boolean          default(FALSE), not null
#  max_count        :integer          default(100), not null
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  fasp_provider_id :bigint           not null
#
# Indexes
#
#  index_fasp_backfill_requests_on_fasp_provider_id  (fasp_provider_id)
#
# Foreign Keys
#
#  fk_rails_...  (fasp_provider_id => fasp_providers.id)
#
Fabricator(:fasp_backfill_request, from: 'Fasp::BackfillRequest') do
  category      'content'
  max_count     10
  cursor        nil
  fulfilled     false
  fasp_provider
end
