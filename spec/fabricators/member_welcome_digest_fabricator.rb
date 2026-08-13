# frozen_string_literal: true

Fabricator(:member_welcome_digest) do
  account { Fabricate(:account) }
  digest_date { Date.current }
  content { 'Welcome back! Something happened.' }
end
