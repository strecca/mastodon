# frozen_string_literal: true

class Api::V1::CommunityListingInterestsController < Api::BaseController
  before_action :require_user!
  before_action :set_listing
  before_action :set_interest, only: [:dismiss, :select]
  before_action :authorize_listing_owner!, only: [:dismiss, :select]

  # POST /api/v1/community_listings/:listing_id/interests
  def create
    return render json: { error: 'Cannot express interest in your own listing' }, status: :unprocessable_entity \
      if @listing.account_id == current_account.id

    return render json: { error: 'Listing is no longer open' }, status: :unprocessable_entity \
      unless @listing.open?

    interest = @listing.community_listing_interests.find_or_initialize_by(account: current_account)

    if interest.persisted?
      render json: { error: 'Already expressed interest' }, status: :unprocessable_entity
      return
    end

    interest.message = params[:message].presence&.truncate(140)

    if interest.save
      CommunityListingNotifyWorker.perform_async(@listing.id, current_account.id)
      render json: { id: interest.id, status: interest.status }, status: :created
    else
      render json: { errors: interest.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/community_listings/:listing_id/interests
  # Lets a user withdraw their own interest
  def destroy
    interest = @listing.community_listing_interests.find_by(account: current_account)
    if interest
      interest.destroy!
      head :no_content
    else
      render json: { error: 'Not found' }, status: :not_found
    end
  end

  # PUT /api/v1/community_listings/:listing_id/interests/:id/select
  def select
    @interest.update!(status: :selected)
    render json: { id: @interest.id, status: @interest.status }
  end

  # PUT /api/v1/community_listings/:listing_id/interests/:id/dismiss
  def dismiss
    @interest.update!(status: :dismissed)
    render json: { id: @interest.id, status: @interest.status }
  end

  private

  def set_listing
    @listing = CommunityListing.find(params[:listing_id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Listing not found' }, status: :not_found
  end

  def set_interest
    @interest = @listing.community_listing_interests.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Interest not found' }, status: :not_found
  end

  def authorize_listing_owner!
    return if @listing.account_id == current_account.id
    return if current_user&.can?(:administrator)
    render json: { error: 'Forbidden' }, status: :forbidden
  end
end
