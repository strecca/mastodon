# frozen_string_literal: true

Fabricator(:member_notification_category_subscription) do
  account
  category_key 'listings'
end
