# frozen_string_literal: true

Fabricator(:member_notification_preference) do
  account
  email_frequency :digest
  quiet_hours_enabled false
end
