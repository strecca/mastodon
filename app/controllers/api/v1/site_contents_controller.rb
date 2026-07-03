# frozen_string_literal: true

class Api::V1::SiteContentsController < Api::BaseController
  skip_before_action :require_authenticated_user!
  before_action :require_admin!, only: [:update]

  # GET /api/v1/site_content?locale=en
  def index
    locale = params[:locale].presence || 'en'
    render json: SiteContent.bulk_for(locale: locale)
  end

  # PATCH /api/v1/site_content
  def update
    key          = params.require(:key)
    locale       = params[:locale].presence || 'en'
    value        = params.require(:value)
    content_type = params[:content_type].presence || 'text'

    record = SiteContent.find_or_initialize_by(key: key, locale: locale)
    record.value        = value
    record.content_type = content_type

    if record.save
      render json: { key: key, locale: locale, value: value }
    else
      render json: { errors: record.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def require_admin!
    return if current_user&.can?(:administrator)

    render json: { error: 'Forbidden' }, status: :forbidden
  end
end
