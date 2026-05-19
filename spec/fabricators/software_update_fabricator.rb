# frozen_string_literal: true

# == Schema Information
#
# Table name: software_updates
#
#  id            :bigint           not null, primary key
#  release_notes :string           default(""), not null
#  type          :integer          default("patch"), not null
#  urgent        :boolean          default(FALSE), not null
#  version       :string           not null
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#
# Indexes
#
#  index_software_updates_on_version  (version) UNIQUE
#
Fabricator(:software_update) do
  version { sequence(:version) { |point| "99.99.#{point}" } }
  urgent false
  type 'patch'
end
