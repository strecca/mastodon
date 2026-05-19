# frozen_string_literal: true

# == Schema Information
#
# Table name: account_warning_presets
#
#  id         :bigint           not null, primary key
#  text       :text             default(""), not null
#  title      :string           default(""), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
Fabricator(:account_warning_preset) do
  text { Faker::Lorem.paragraph }
end
