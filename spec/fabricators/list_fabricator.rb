# frozen_string_literal: true

# == Schema Information
#
# Table name: lists
#
#  id             :bigint           not null, primary key
#  exclusive      :boolean          default(FALSE), not null
#  replies_policy :integer          default("list"), not null
#  title          :string           default(""), not null
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  account_id     :bigint           not null
#
# Indexes
#
#  index_lists_on_account_id  (account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:list) do
  account { Fabricate.build(:account) }
  title 'MyString'
end
