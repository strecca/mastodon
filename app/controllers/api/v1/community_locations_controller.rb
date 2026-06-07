# frozen_string_literal: true

class Api::V1::CommunityLocationsController < Api::BaseController
  skip_before_action :require_authenticated_user!, only: [:index]
  before_action :require_admin!, only: [:create, :update, :destroy]
  before_action :set_location, only: [:update, :destroy]

  # GET /api/v1/community_locations
  # Public — returns all active locations ordered for use in select menus.
  def index
    locations = CommunityLocation.active.ordered
    render json: locations.map { |l| serialize(l) }
  end

  # POST /api/v1/community_locations
  def create
    location = CommunityLocation.new(location_params)
    if location.save
      render json: serialize(location), status: :created
    else
      render json: { errors: location.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # PUT /api/v1/community_locations/:id
  def update
    if @location.update(location_params)
      render json: serialize(@location)
    else
      render json: { errors: @location.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/community_locations/:id
  def destroy
    @location.destroy!
    head :no_content
  end

  private

  def set_location
    @location = CommunityLocation.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Not found' }, status: :not_found
  end

  def require_admin!
    return if current_user&.can?(:administrator)
    render json: { error: 'Forbidden' }, status: :forbidden
  end

  def location_params
    params.permit(:name, :active, :sort_order)
  end

  def serialize(location)
    {
      id:         location.id,
      name:       location.name,
      active:     location.active,
      sort_order: location.sort_order,
    }
  end
end
