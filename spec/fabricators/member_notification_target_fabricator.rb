# frozen_string_literal: true

Fabricator(:member_notification_target) do
  account
  target_account { Fabricate(:account) }
end
