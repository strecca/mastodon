# frozen_string_literal: true

# Resolves a lightweight {title:, description:, image_url:} Open Graph
# preview for community-directory detail pages and newsletters, so links
# shared on WhatsApp/Facebook/etc. show the actual entry instead of the
# generic site-wide preview. Field names are read from each category's
# config.json (the same source entry_detail.jsx uses client-side) instead
# of being hardcoded per model, since db_name varies category to category.
class CommunityOgPreview
  CATEGORY_MODELS = {
    'artists'     => CommunityArtist,
    'events'      => CommunityEvent,
    'properties'  => CommunityProperty,
    'restaurants' => CommunityRestaurant,
    'services'    => CommunityService,
  }.freeze

  ENTRY_PATH      = %r{\A/community_(artists|events|properties|restaurants|services)/(\d+)\z}
  LISTING_PATH    = %r{\A/community_listings/(\d+)\z}
  NEWSLETTER_PATH = %r{\A/newsletters/([a-z0-9-]+)\z}

  DESCRIPTION_MAX_LENGTH = 200

  def initialize(base_url)
    @base_url = base_url
  end

  def for_path(path)
    if (m = ENTRY_PATH.match(path))
      entry_preview(m[1], m[2])
    elsif (m = LISTING_PATH.match(path))
      listing_preview(m[1])
    elsif (m = NEWSLETTER_PATH.match(path))
      newsletter_preview(m[1])
    end
  rescue StandardError => e
    Rails.logger.error("[CommunityOgPreview] #{e.class}: #{e.message}")
    nil
  end

  private

  def entry_preview(category_key, id)
    model  = CATEGORY_MODELS.fetch(category_key)
    record = model.approved.find_by(id: id)
    return nil unless record

    config = category_config(category_key)
    image  = image_media_attachments(record).first

    {
      title:       entry_title(record, config),
      description: entry_description(record, config).presence || config['description'].to_s,
      image_url:   image && file_url(image.file),
    }
  end

  def listing_preview(id)
    record = CommunityListing.find_by(id: id)
    return nil unless record

    image = image_media_attachments(record).first

    {
      title:       record.title,
      description: truncate(record.description.to_s).presence || 'A community listing on MiaCivezza.com',
      image_url:   image && file_url(image.file),
    }
  end

  def newsletter_preview(slug)
    record = CommunityNewsletter.published.find_by(slug: slug)
    return nil unless record

    body  = record.left_column_en.presence || record.right_column_en.presence || record.source_text.to_s
    asset = record.asset_for(:header_graphic) || record.asset_for(:editorial_photo)

    {
      title:       record.title,
      description: truncate(strip_markup(body)).presence || "A newsletter from MiaCivezza.com by #{record.author_name}",
      image_url:   asset && absolute_url(asset.image_url),
    }
  end

  def category_config(category_key)
    @configs ||= {}
    @configs[category_key] ||= begin
      path = Rails.root.join('app', 'javascript', 'flavours', 'glitch', 'features', "community_#{category_key}", 'config.json')
      JSON.parse(File.read(path))
    end
  end

  def entry_title(record, config)
    if record.respond_to?(:first_name) && (record.first_name.present? || record.last_name.present?)
      [record.first_name, record.last_name].compact_blank.join(' ')
    else
      name_field = config['fields'].find { |f| %w[display_name name title].include?(f['db_name']) }
      name_field ? record[name_field['db_name']].to_s : config['display_name']
    end
  end

  def entry_description(record, config)
    desc_field = config['fields'].find { |f| f['widget'] == 'textarea' }
    desc_field ? truncate(record[desc_field['db_name']].to_s) : ''
  end

  def image_media_attachments(record)
    record.respond_to?(:image_media_attachments) ? record.image_media_attachments : []
  end

  def file_url(paperclip_like_file)
    raw = paperclip_like_file.url(:original)
    absolute_url(raw)
  rescue StandardError
    nil
  end

  def absolute_url(raw)
    return nil if raw.blank?

    raw.start_with?('http') ? raw : "#{@base_url}#{raw}"
  end

  def truncate(text)
    text.to_s.squish.truncate(DESCRIPTION_MAX_LENGTH)
  end

  def strip_markup(text)
    ActionController::Base.helpers.strip_tags(text.to_s)
  end
end
