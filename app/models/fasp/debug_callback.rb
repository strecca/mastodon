# frozen_string_literal: true

# == Schema Information
#
# Table name: fasp_debug_callbacks
#
#  id               :bigint           not null, primary key
#  ip               :string           not null
#  request_body     :text             not null
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  fasp_provider_id :bigint           not null
#
# Indexes
#
#  index_fasp_debug_callbacks_on_fasp_provider_id  (fasp_provider_id)
#
# Foreign Keys
#
#  fk_rails_...  (fasp_provider_id => fasp_providers.id)
#
class Fasp::DebugCallback < ApplicationRecord
  belongs_to :fasp_provider, class_name: 'Fasp::Provider'
end
