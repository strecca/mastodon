# frozen_string_literal: true

class Api::V1::CommunityDailyDigestsController < Api::BaseController
  skip_before_action :require_authenticated_user!

  def show
    date   = params[:id] == 'today' ? Date.today : Date.iso8601(params[:id])
    digest = CommunityDailyDigest.find_by(digest_date: date)

    if digest
      render json: {
        date:          digest.digest_date.iso8601,
        content_it:    digest.content_it,
        content_en:    digest.content_en,
        article_count: digest.article_count,
        generated_at:  digest.generated_at&.iso8601,
      }
    else
      render json: { error: 'no_digest' }, status: :not_found
    end
  rescue ArgumentError, Date::Error
    render json: { error: 'invalid_date' }, status: :unprocessable_entity
  end

  def index
    dates = CommunityDailyDigest.ordered.limit(60).pluck(:digest_date)
    render json: { dates: dates.map(&:iso8601) }
  end
end
