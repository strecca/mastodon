# frozen_string_literal: true

class Api::V1::CommunityRestaurantsController < Api::BaseController
  CATEGORY_KEY = 'restaurants'
  MODEL = CommunityRestaurant

  include CommunityCategoryController

  private

  def sort_for(sort)
    case sort
    when 'oldest'  then [:created_at, :asc]
    when 'az'      then [:name, :asc]
    when 'updated' then [:updated_at, :desc]
    else                [:created_at, :desc]
    end
  end

  def entry_params
    p = params.require(:entry).permit(:name, :cuisine_type, :town, :description, :phone, :website, :price_range, :opening_hours, :features)
    p[:cuisine_type] = params[:entry][:cuisine_type] if params[:entry][:cuisine_type].is_a?(Array)
    p[:features]     = params[:entry][:features]     if params[:entry][:features].is_a?(Array)
    p
  end

  def serialize(e, detail: true)
    base = base_entry_fields(e).merge(
      name:         e.name,
      cuisine_type: e.cuisine_type,
      town:         e.town,
      phone:        e.phone,
      price_range:  e.price_range,
    )

    return base unless detail

    base.merge(
      description:   e.description,
      website:       e.website,
      opening_hours: e.opening_hours,
      features:      e.features,
      translations:  translations_for(e),
    )
  end
end
