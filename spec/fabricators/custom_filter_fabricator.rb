# frozen_string_literal: true

# == Schema Information
#
# Table name: custom_filters
#
#  id         :bigint           not null, primary key
#  action     :integer          default("warn"), not null
#  context    :string           default([]), not null, is an Array
#  expires_at :datetime
#  phrase     :text             default(""), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#
# Indexes
#
#  index_custom_filters_on_account_id  (account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:custom_filter) do
  account { Fabricate.build(:account) }
  expires_at nil
  phrase     'discourse'
  context    %w(home notifications)
end
