# frozen_string_literal: true

class Api::V1::CommunityQuickSharesController < Api::BaseController
  skip_before_action :require_authenticated_user!, only: [:index, :show]

  before_action :require_user!, only: [:create, :destroy, :share_as_post]
  before_action :require_moderator!, only: [:create]
  before_action :set_quick_share, only: [:show, :destroy, :share_as_post]
  before_action :authorize_owner!, only: [:destroy, :share_as_post]

  # GET /api/v1/community_quick_shares
  # Public, newest first. Filtering (by poster) and search (by caption) are
  # done client-side -- volume here is inherently small (creation is
  # Moderator+ only), so a second query param surface isn't worth it yet.
  def index
    @shares = CommunityQuickShare.order(created_at: :desc).limit(60).includes(:account)
    render json: @shares.map { |s| serialize(s) }
  end

  # GET /api/v1/community_quick_shares/:slug
  def show
    render json: serialize(@quick_share)
  end

  # POST /api/v1/community_quick_shares
  def create
    uploaded = params[:pdf_file]

    if uploaded.blank?
      render json: { error: 'A PDF file is required' }, status: :unprocessable_entity
      return
    end

    if uploaded.content_type != 'application/pdf'
      render json: { error: 'Only PDF files are supported' }, status: :unprocessable_entity
      return
    end

    @quick_share = CommunityQuickShare.new(caption: params[:caption], account: current_account)

    if @quick_share.save
      store_pdf(@quick_share, uploaded.tempfile.path)
      render json: serialize(@quick_share), status: :created
    else
      render json: { error: @quick_share.errors.full_messages.to_sentence }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/community_quick_shares/:slug
  def destroy
    @quick_share.destroy
    render json: {}
  end

  # POST /api/v1/community_quick_shares/:slug/share_as_post
  def share_as_post
    if @quick_share.shared_as_post?
      render json: { error: 'Already shared as a post' }, status: :unprocessable_entity
      return
    end

    text = params[:text].to_s.strip
    if text.blank?
      render json: { error: 'Post text is required' }, status: :unprocessable_entity
      return
    end

    share_url = "https://#{Rails.configuration.x.web_domain}/shared/#{@quick_share.slug}"
    status = PostStatusService.new.call(
      current_account,
      text:       "#{text}\n\n#{share_url}",
      visibility: :public
    )
    @quick_share.update_column(:mastodon_status_id, status.id.to_s)

    render json: serialize(@quick_share)
  end

  private

  def set_quick_share
    @quick_share = CommunityQuickShare.find_by!(slug: params[:slug] || params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Not found' }, status: :not_found
  end

  def authorize_owner!
    return if @quick_share.account_id == current_account.id
    return if current_user&.can?(:administrator)
    render json: { error: 'Forbidden' }, status: :forbidden
  end

  def require_moderator!
    return if current_user&.can?(:administrator) || current_user&.can?(:manage_reports)
    render json: { error: 'Forbidden' }, status: :forbidden
  end

  def store_pdf(quick_share, tmp_path)
    return unless File.exist?(tmp_path)

    store_dir = Rails.root.join('public', 'quick_share_assets', quick_share.id.to_s)
    FileUtils.mkdir_p(store_dir)
    dest = store_dir.join('original.pdf')
    FileUtils.cp(tmp_path, dest)
    quick_share.update_column(:pdf_path, "quick_share_assets/#{quick_share.id}/original.pdf")
  rescue StandardError => e
    Rails.logger.warn("CommunityQuickShare store_pdf failed: #{e.message}")
  end

  def serialize(quick_share)
    owner = quick_share.account
    {
      id:                 quick_share.id.to_s,
      slug:               quick_share.slug,
      caption:            quick_share.caption,
      pdf_url:            quick_share.pdf_path.present? ? "/#{quick_share.pdf_path}" : nil,
      mastodon_status_id: quick_share.mastodon_status_id,
      shared_as_post:     quick_share.shared_as_post?,
      created_at:         quick_share.created_at,
      account: {
        id:           owner.id.to_s,
        username:     owner.username,
        display_name: owner.display_name,
        avatar:       owner.avatar_original_url,
      },
    }
  end
end
