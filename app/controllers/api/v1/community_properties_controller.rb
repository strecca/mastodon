# frozen_string_literal: true

class Api::V1::CommunityPropertiesController < Api::BaseController
  CATEGORY_KEY = 'properties'
  MODEL = CommunityProperty

  include CommunityCategoryController

  private

  def sort_for(sort)
    case sort
    when 'oldest'  then [:created_at, :asc]
    when 'az'      then [:title, :asc]
    when 'updated' then [:updated_at, :desc]
    else                [:created_at, :desc]
    end
  end

  def entry_params
    p = params.require(:entry).permit(:title, :listing_type, :property_type, :town, :description,
                                      :price, :price_period, :available_from, :bedrooms, :bathrooms,
                                      :size_sqm, :floor, :furnished, :condition, :features,
                                      :phone, :email, :agency_name)
    p[:features] = params[:entry][:features] if params[:entry][:features].is_a?(Array)
    p
  end

  def serialize(e, detail: true)
    base = base_entry_fields(e).merge(
      title:          e.title,
      listing_type:   e.listing_type,
      property_type:  e.property_type,
      town:           e.town,
      price:          e.price,
      price_period:   e.price_period,
      available_from: e.available_from,
      bedrooms:       e.bedrooms,
      size_sqm:       e.size_sqm,
      phone:          e.phone,
    )

    return base unless detail

    base.merge(
      description:  e.description,
      bathrooms:    e.bathrooms,
      floor:        e.floor,
      furnished:    e.furnished,
      condition:    e.condition,
      features:     e.features,
      email:        e.email,
      agency_name:  e.agency_name,
      translations: translations_for(e),
    )
  end
end
