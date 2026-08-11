# frozen_string_literal: true

class Api::V1::CivezzaMemberStoriesController < Api::BaseController
  before_action :require_user!
  before_action :set_story, only: [:show]

  # GET /api/v1/civezza_member_stories
  def index
    @stories = CivezzaMemberStory.published
                                  .includes(:account)
                                  .order(updated_at: :desc)
                                  .limit(200)
    render json: @stories.map { |s| serialize(s) }
  end

  # GET /api/v1/civezza_member_stories/me
  def me
    story = CivezzaMemberStory.find_or_initialize_by(account: current_account)
    render json: serialize(story, own: true)
  end

  # GET /api/v1/civezza_member_stories/:account_id
  def show
    unless @story&.published? || @story&.account_id == current_account.id
      return render json: { error: 'Not found' }, status: :not_found
    end
    render json: serialize(@story, own: @story.account_id == current_account.id)
  end

  # POST /api/v1/civezza_member_stories/upsert
  def upsert
    story = CivezzaMemberStory.find_or_initialize_by(account: current_account)
    story.assign_attributes(story_params)
    story.image_media_ids = validated_media_ids if params.key?(:media_ids)

    if story.save
      CommunityTranslationWorker.perform_async('CivezzaMemberStory', story.id)
      CommunityEntryNotifyWorker.perform_async('new_entry', 'CivezzaMemberStory', story.id, 'member_stories') if story.previously_new_record?
      status = story.previously_new_record? ? :created : :ok
      render json: serialize(story, own: true), status: status
    else
      render json: { errors: story.errors.full_messages }, status: :unprocessable_entity
    end
  rescue StandardError => e
    Rails.logger.error("[MemberStories#upsert] #{e.class}: #{e.message}")
    render json: { errors: [e.message] }, status: :internal_server_error
  end

  private

  def set_story
    @story = CivezzaMemberStory.includes(:account).find_by(account_id: params[:account_id])
    render json: { error: 'Not found' }, status: :not_found unless @story
  end

  def story_params
    params.permit(:about_me, :civezza_story, :shaping_moment, :why_i_joined, :published)
  end

  def validated_media_ids
    ids = Array(params[:media_ids]).first(3).map(&:to_i).select(&:positive?)
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

  def image_data_for(story)
    story.image_media_attachments.filter_map do |ma|
      original = attachment_url(ma, :original)
      next if original.blank?
      { original: original, preview: attachment_url(ma, :small) || original }
    end
  rescue StandardError
    []
  end

  def serialize(story, own: false)
    owner = story.account
    imgs  = image_data_for(story)
    {
      id:              story.id,
      account_id:      owner&.id.to_s,
      about_me:        story.about_me,
      civezza_story:   story.civezza_story,
      shaping_moment:  story.shaping_moment,
      why_i_joined:    story.why_i_joined,
      published:       story.published?,
      images:          imgs.map { |i| i[:original] },
      image_previews:  imgs.map { |i| i[:preview] },
      image_media_ids: story.image_media_ids,
      account: owner ? {
        id:           owner.id.to_s,
        username:     owner.username,
        display_name: owner.display_name.presence || owner.username,
        avatar:       owner.avatar_original_url,
      } : nil,
      is_own:       own,
      translations: CommunityEntryTranslation
        .where(translatable_type: 'CivezzaMemberStory', translatable_id: story.id)
        .each_with_object({}) { |t, h| (h[t.locale] ||= {})[t.field_name] = t.translated_text },
      created_at: story.created_at&.iso8601,
      updated_at: story.updated_at&.iso8601,
    }
  end
end
