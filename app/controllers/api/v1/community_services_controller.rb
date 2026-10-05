# frozen_string_literal: true

class Api::V1::CommunityServicesController < Api::BaseController
  CATEGORY_KEY = 'services'
  MODEL = CommunityService

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
    p = params.require(:entry).permit(:name, :category, :town, :description, :phone, :email, :website, :business_hours, :price_range, :languages_spoken)
    p[:category] = params[:entry][:category] if params[:entry][:category].is_a?(Array)
    p[:languages_spoken] = params[:entry][:languages_spoken] if params[:entry][:languages_spoken].is_a?(Array)
    p
  end

  def serialize(e, detail: true)
    base = base_entry_fields(e).merge(
      name:        e.name,
      category:    e.category,
      town:        e.town,
      phone:       e.phone,
      price_range: e.price_range,
    )

    return base unless detail

    base.merge(
      description:      e.description,
      email:            e.email,
      website:          e.website,
      business_hours:   e.business_hours,
      languages_spoken: e.languages_spoken,
      translations:     translations_for(e),
    )
  end
end
