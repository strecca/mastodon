# frozen_string_literal: true

# == Schema Information
#
# Table name: user_roles
#
#  id          :bigint           not null, primary key
#  color       :string           default(""), not null
#  highlighted :boolean          default(FALSE), not null
#  name        :string           default(""), not null
#  permissions :bigint           default(0), not null
#  position    :integer          default(0), not null
#  require_2fa :boolean          default(FALSE), not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#
Fabricator(:user_role) do
  name        'MyString'
  color       ''
  permissions 0
end
