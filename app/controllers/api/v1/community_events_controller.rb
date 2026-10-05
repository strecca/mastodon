class Api::V1::CommunityEventsController < Api::BaseController
  CATEGORY_KEY = 'events'
  MODEL = CommunityEvent

  include CommunityCategoryController

  private

  def sort_for(sort)
    case sort
    when 'past'   then [:event_date, :desc]
    when 'newest' then [:created_at, :desc]
    when 'az'     then [:event_name, :asc]
    else               [:event_date, :asc]
    end
  end

  # Capped at 2, not the usual 3 -- Events intentionally allows fewer photos
  # per entry than other categories.
  def max_media_ids
    2
  end

  def entry_params
    params.require(:entry).permit(:event_name, :event_description, :event_date,
                                  :location_town_city, :contact_info_1, :contact_info_2,
                                  :website, :telephone, category: [])
  end

  def serialize(e, detail: true)
    base = base_entry_fields(e).merge(
      category:           e.category,
      event_name:         e.event_name,
      event_date:         e.event_date&.iso8601,
      location_town_city: e.location_town_city,
    )

    return base unless detail

    base.merge(
      event_description: e.event_description,
      end_date:          e.end_date&.iso8601,
      contact_info_1:    e.contact_info_1,
      contact_info_2:    e.contact_info_2,
      website:           e.website,
      telephone:         e.telephone,
      source_url:        e.source_url,
      source_name:       e.source_name,
      auto_imported:     e.auto_imported,
      translations:      translations_for(e)
    )
  end
end
