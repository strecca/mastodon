# frozen_string_literal: true

# == Schema Information
#
# Table name: settings
#
#  id         :bigint           not null, primary key
#  value      :text
#  var        :string           not null
#  created_at :datetime
#  updated_at :datetime
#
# Indexes
#
#  index_settings_on_var  (var) UNIQUE
#
Fabricator(:setting) do
  var { sequence(:var) { |n| "var_#{n}" } }
end
