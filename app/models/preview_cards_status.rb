# frozen_string_literal: true

# == Schema Information
#
# Table name: preview_cards_statuses
#
#  url             :string
#  preview_card_id :bigint           not null, primary key
#  status_id       :bigint           not null, primary key
#
class PreviewCardsStatus < ApplicationRecord
  self.primary_key = [:preview_card_id, :status_id]

  belongs_to :preview_card
  belongs_to :status
end
