# frozen_string_literal: true

Fabricator(:community_quick_share) do
  account
  caption 'A test caption'
  pdf_path 'quick_share_assets/1/original.pdf'
end
