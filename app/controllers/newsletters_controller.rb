# frozen_string_literal: true

class NewslettersController < ApplicationController
  def index
    @newsletters = CommunityNewsletter.published_recent.page(params[:page]).per(12)
  end

  def show
    @newsletter = CommunityNewsletter.published.find_by!(slug: params[:slug])
    @assets     = @newsletter.newsletter_assets.ordered
  end
end
