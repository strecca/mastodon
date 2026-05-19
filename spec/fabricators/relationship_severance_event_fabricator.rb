# frozen_string_literal: true

# == Schema Information
#
# Table name: relationship_severance_events
#
#  id          :bigint           not null, primary key
#  purged      :boolean          default(FALSE), not null
#  target_name :string           not null
#  type        :integer          not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#
# Indexes
#
#  index_relationship_severance_events_on_type_and_target_name  (type,target_name)
#
Fabricator(:relationship_severance_event) do
  type { :domain_block }
  target_name { 'example.com' }
end
