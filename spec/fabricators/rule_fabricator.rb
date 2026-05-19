# frozen_string_literal: true

# == Schema Information
#
# Table name: rules
#
#  id         :bigint           not null, primary key
#  deleted_at :datetime
#  hint       :text             default(""), not null
#  priority   :integer          default(0), not null
#  text       :text             default(""), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
Fabricator(:rule) do
  priority   0
  deleted_at nil
  text       { Faker::Lorem.paragraph }
end
