# frozen_string_literal: true

class Api::V1::CommunityNewslettersController < Api::BaseController
  skip_before_action :require_authenticated_user!

  def index
    newsletters = CommunityNewsletter.published_recent.limit(40)
    render json: {
      newsletters: newsletters.map { |nl| serialize_newsletter(nl) },
    }
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
