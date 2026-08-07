# frozen_string_literal: true

class Api::V1::CommunityNewslettersController < Api::BaseController
  CATEGORY_KEY = 'newsletters'

  include CommunityCacheable

  skip_before_action :require_authenticated_user!

  # cached_list only depends on CATEGORY_KEY -- no config.json for this
  # hand-built feature, so list_columns/list_field_names are never called.
  # Writes happen in Admin::NewslettersController (separate controller,
  # same CATEGORY_KEY), which calls invalidate_list_cache on the shared
  # Redis key -- cache invalidation isn't tied to which controller wrote it.
  def index
    result = cached_list do
      newsletters = CommunityNewsletter.published_recent.limit(40)
      { newsletters: newsletters.map { |nl| serialize_newsletter(nl) } }
    end
    render json: result
  end

  def show
    newsletter = CommunityNewsletter.published.find_by!(slug: params[:slug])
    render json: serialize_newsletter(newsletter, full: true)
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'not_found' }, status: :not_found
  end

  private

  def serialize_newsletter(nl, full: false)
    base = {
      id:                  nl.id,
      slug:                nl.slug,
      title:               nl.title,
      author_name:         nl.author_name,
      published_on:        nl.published_on&.iso8601,
      masthead_location:   nl.masthead_location,
      footer_attribution:  nl.footer_attribution,
      newsletter_template: nl.newsletter_template,
      layout_variant:      nl.layout_variant,
      design_tokens:       nl.design_tokens,
      original_pdf_url:    nl.original_pdf_path.present? ? "/#{nl.original_pdf_path}" : nil,
      excerpt_it:          nl.right_column_it.to_s.truncate(180),
      excerpt_en:          nl.right_column_en.to_s.truncate(180),
    }
    return base unless full

    base.merge(
      left_column_it:  nl.left_column_it.to_s,
      left_column_en:  nl.left_column_en.to_s,
      right_column_it: nl.right_column_it.to_s,
      right_column_en: nl.right_column_en.to_s,
    )
  end
end
