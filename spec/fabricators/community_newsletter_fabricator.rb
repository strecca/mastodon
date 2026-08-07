# frozen_string_literal: true

Fabricator(:community_newsletter) do
  title 'A Test Newsletter'
  author_name 'Test Author'
  status :published
  published_on { Date.today }
end
