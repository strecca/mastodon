# frozen_string_literal: true

class Api::V1::CommunityLandingController < Api::BaseController
  skip_before_action :require_authenticated_user!

  before_action :require_admin!, only: [:update]

  # GET /api/v1/community_landing
  def show
    render json: serialize(CommunityLandingSetting.instance)
  end

  # PATCH /api/v1/community_landing
  def update
    settings = CommunityLandingSetting.instance
    if settings.update(landing_params)
      render json: serialize(settings)
    else
      render json: { errors: settings.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def landing_params
    params.permit(:site_name, :site_subtitle, :tagline, :join_heading, :join_body)
  end

  def serialize(s)
    {
      site_name:     s.site_name,
      site_subtitle: s.site_subtitle,
      tagline:       s.tagline,
      join_heading:  s.join_heading,
      join_body:     s.join_body,
    }
  end

  def require_admin!
    return if current_user&.can?(:administrator)
    render json: { error: 'Forbidden' }, status: :forbidden
  end
end
