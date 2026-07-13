# frozen_string_literal: true

class Api::V1::CommunityListingsController < Api::BaseController
  skip_before_action :require_authenticated_user!, only: [:index, :show]

  before_action :require_user!, only: [:create, :update, :destroy, :fulfill, :close]
  before_action :set_listing,   only: [:show, :update, :destroy, :fulfill, :close]
  before_action :authorize_owner!, only: [:update, :fulfill, :close]

  # GET /api/v1/community_listings
  def index
    scope = CommunityListing.publicly_visible.includes(:account).recent

    scope = scope.by_type(params[:listing_type]) if params[:listing_type].present?
    scope = scope.search(params[:q])

    @listings = scope.limit(60)

    listing_ids = @listings.map(&:id)
    translations_by_id = CommunityEntryTranslation
      .where(translatable_type: 'CommunityListing', translatable_id: listing_ids)
      .each_with_object({}) do |t, h|
        (h[t.translatable_id] ||= {})[t.locale] ||= {}
        h[t.translatable_id][t.locale][t.field_name] = t.translated_text
      end

    render json: @listings.map { |l| serialize(l).merge(translations: translations_by_id[l.id] || {}) }
  end

  # GET /api/v1/community_listings/:id
  def show
    render json: serialize(@listing, detail: true)
  end

  # POST /api/v1/community_listings
  def create
    @listing = CommunityListing.new(listing_params)
    @listing.account    = current_account
    @listing.expires_at = 60.days.from_now
    @listing.image_media_ids = validated_media_ids

    if @listing.save
      CommunityTranslationWorker.perform_async('CommunityListing', @listing.id)
      CommunityDirectoryRefreshWorker.perform_in(30.seconds, 'community:listings')
      render json: serialize(@listing), status: :created
    else
      render json: { errors: @listing.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # PUT /api/v1/community_listings/:id
  def update
    attrs = listing_params.to_h
    attrs[:image_media_ids] = validated_media_ids if params.key?(:media_ids)

    if @listing.update(attrs)
      CommunityTranslationWorker.perform_async('CommunityListing', @listing.id)
      CommunityDirectoryRefreshWorker.perform_in(30.seconds, 'community:listings')
      render json: serialize(@listing)
    else
      render json: { errors: @listing.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/community_listings/:id
  def destroy
    @listing.destroy!
    head :no_content
  end

  # POST /api/v1/community_listings/:id/fulfill
  def fulfill
    @listing.update!(status: :fulfilled)
    render json: serialize(@listing)
  end

  # POST /api/v1/community_listings/:id/close
  def close
    @listing.update!(status: :closed)
    render json: serialize(@listing)
  end

  private

  def set_listing
    @listing = CommunityListing.includes(:account, :community_listing_interests).find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Listing not found' }, status: :not_found
  end

  def authorize_owner!
    return if @listing.account_id == current_account.id
    return if current_user&.can?(:administrator)
    render json: { error: 'Forbidden' }, status: :forbidden
  end

  def listing_params
    params.require(:listing).permit(
      :listing_type, :title, :description, :condition_value,
      :price, :currency, :rental_period, :trade_for, :location,
      category: []
    )
  end

  def validated_media_ids
    ids = Array(params[:media_ids]).first(4).map(&:to_i).select(&:positive?)
    return [] if ids.empty?
    MediaAttachment.where(id: ids, account: current_account).pluck(:id)
  end

  def attachment_url(ma, style)
    raw = style == :original && ma.remote_url.present? ? ma.remote_url : ma.file.url(style)
    return nil if raw.blank?
    raw.start_with?('http') ? raw : "#{request.base_url}#{raw}"
  rescue StandardError
    nil
  end

  def image_data_for(listing)
    listing.image_media_attachments.filter_map do |ma|
      original = attachment_url(ma, :original)
      next if original.blank?
      { original: original, preview: attachment_url(ma, :small) || original }
    end
  rescue StandardError
    []
  end

  def serialize(listing, detail: false)
    owner   = listing.account
    imgs    = image_data_for(listing)
    data = {
      id:            listing.id,
      listing_type:  listing.listing_type,
      title:         listing.title,
      description:   listing.description,
      category:      listing.category,
      condition:     listing.condition_value,
      price:         listing.price&.to_s,
      currency:      listing.currency,
      rental_period: listing.rental_period,
      trade_for:     listing.trade_for,
      location:      listing.location,
      status:        listing.status,
      interest_count: listing.community_listing_interests.size,
      images:          imgs.map { |i| i[:original] },
      image_previews:  imgs.map { |i| i[:preview] },
      image_media_ids: listing.image_media_ids,
      account: {
        id:           owner.id.to_s,
        username:     owner.username,
        display_name: owner.display_name,
        avatar:       owner.avatar_original_url,
      },
      is_own:     current_account&.id == listing.account_id,
      interested: current_account ? listing.interested?(current_account) : false,
      created_at: listing.created_at.iso8601,
      updated_at: listing.updated_at.iso8601,
    }

    if detail
      data[:translations] = CommunityEntryTranslation
        .where(translatable_type: 'CommunityListing', translatable_id: listing.id)
        .each_with_object({}) { |t, h| (h[t.locale] ||= {})[t.field_name] = t.translated_text }

      if current_account&.id == listing.account_id
        data[:interests] = listing.community_listing_interests
                                  .includes(:account)
                                  .order(created_at: :asc)
                                  .map { |i| serialize_interest(i) }
      end
    end

    data
  end

  def serialize_interest(interest)
    acc = interest.account
    {
      id:      interest.id,
      message: interest.message,
      status:  interest.status,
      account: {
        id:           acc.id.to_s,
        username:     acc.username,
        display_name: acc.display_name,
        avatar:       acc.avatar_original_url,
      },
      created_at: interest.created_at.iso8601,
    }
  end
end
