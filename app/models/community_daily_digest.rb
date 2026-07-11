# frozen_string_literal: true

class CommunityDailyDigest < ApplicationRecord
  validates :digest_date, presence: true, uniqueness: true

  scope :ordered, -> { order(digest_date: :desc) }

  def content_for(locale)
    case locale.to_s
    when 'it' then content_it.presence || content_en
    when 'en' then content_en.presence || content_it
    else content_it.presence || content_en
    end
  end
end
