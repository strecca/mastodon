# frozen_string_literal: true

# == Schema Information
#
# Table name: notification_policies
#
#  id                   :bigint           not null, primary key
#  for_limited_accounts :integer          default("filter"), not null
#  for_new_accounts     :integer          default("accept"), not null
#  for_not_followers    :integer          default("accept"), not null
#  for_not_following    :integer          default("accept"), not null
#  for_private_mentions :integer          default("filter"), not null
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  account_id           :bigint           not null
#
# Indexes
#
#  index_notification_policies_on_account_id  (account_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
Fabricator(:notification_policy) do
  account
  filter_not_following false
  filter_not_followers false
  filter_new_accounts false
  filter_private_mentions true
end
