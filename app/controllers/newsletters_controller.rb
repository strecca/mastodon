# frozen_string_literal: true

class NewslettersController < ApplicationController
  skip_before_action :require_functional!

  def index
    @newsletters = CommunityNewsletter.published_recent.limit(40)
  end

  def show
    @newsletter = CommunityNewsletter.published.find_by!(slug: params[:slug])
    @assets     = @newsletter.newsletter_assets.ordered
  end

  # Print-to-PDF: renders a standalone styled HTML page the browser can save as PDF.
  def pdf
    @newsletter = CommunityNewsletter.published.find_by!(slug: params[:slug])
    render layout: false
  rescue ActiveRecord::RecordNotFound
    render plain: 'Newsletter not found', status: :not_found
  end
end
