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
end
