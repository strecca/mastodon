# frozen_string_literal: true

class Api::V1::CommunityArtistsController < Api::BaseController
  CATEGORY_KEY = 'artists'
  MODEL = CommunityArtist

  include CommunityCategoryController

  private

  def sort_for(sort)
    case sort
    when 'oldest'  then [:created_at, :asc]
    when 'az'      then [:first_name, :asc]
    when 'updated' then [:updated_at, :desc]
    else                [:created_at, :desc]
    end
  end

  def entry_params
    p = params.require(:entry).permit(:category, :location_town_city, :first_name, :last_name, :artist_description, :hours_schedule, :contact_info_1, :contact_info_2, :website, :telephone)
    p[:category] = params[:entry][:category] if params[:entry][:category].is_a?(Array)
    p
  end

  def serialize(e, detail: true)
    base = base_entry_fields(e).merge(
      category:           e.category,
      location_town_city: e.location_town_city,
      first_name:         e.first_name,
      last_name:          e.last_name,
      telephone:          e.telephone,
    )

    return base unless detail

    base.merge(
      artist_description: e.artist_description,
      hours_schedule:     e.hours_schedule,
      contact_info_1:     e.contact_info_1,
      contact_info_2:     e.contact_info_2,
      website:            e.website,
      translations:       translations_for(e)
    )
  end
end
