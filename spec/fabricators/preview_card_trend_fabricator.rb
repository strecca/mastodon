# frozen_string_literal: true

# == Schema Information
#
# Table name: preview_card_trends
#
#  id              :bigint           not null, primary key
#  allowed         :boolean          default(FALSE), not null
#  language        :string
#  rank            :integer          default(0), not null
#  score           :float            default(0.0), not null
#  preview_card_id :bigint           not null
#
# Indexes
#
#  index_preview_card_trends_on_preview_card_id  (preview_card_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (preview_card_id => preview_cards.id) ON DELETE => cascade
#
Fabricator(:preview_card_trend) do
  preview_card
end
