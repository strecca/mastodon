# frozen_string_literal: true

# Provides Redis list-response caching and slim column selection for
# community category controllers.
#
# Including controllers must define CATEGORY_KEY.
#
# How it works:
#  - index reads list_columns from config.json (show_in_list: true fields only)
#    and applies them as a SELECT so large text fields are never loaded for lists
#  - the serialized list response is cached in Redis for 5 minutes keyed by
#    category + sort + query + page
#  - cache is invalidated by incrementing a version counter any time an entry
#    is written (create/update/destroy) or when a moderation status change
#    happens via the model callback in CommunitySearchable
#
# To add a field to list output: set show_in_list: true in config.json and
# restart mastodon-web.
module CommunityCacheable
  extend ActiveSupport::Concern

  BASE_LIST_COLS = %w[id account_id status created_at updated_at].freeze

  included do
    class_attribute :_cd_list_columns, :_cd_list_field_names, instance_accessor: false

    config_path = Rails.root.join(
      'app', 'javascript', 'flavours', 'glitch', 'features',
      "community_#{self::CATEGORY_KEY}", 'config.json'
    )

    if File.exist?(config_path)
      cfg_fields = JSON.parse(File.read(config_path)).fetch('fields', [])
      list_names  = cfg_fields.select { |f| f['show_in_list'] }.map { |f| f['db_name'] }

      self._cd_list_columns     = (BASE_LIST_COLS + list_names).map(&:to_sym)
      self._cd_list_field_names = list_names
    end
  end

  private

  # Columns to SELECT for list queries — skips large text-only detail fields
  def list_columns
    self.class._cd_list_columns
  end

  # Field names that belong in a list-view JSON response
  def list_field_names
    self.class._cd_list_field_names || []
  end

  # Cache key includes a version counter so a single Redis INCREMENT
  # invalidates all pages/sorts/queries for this category at once.
  def list_cache_key
    v = Rails.cache.read("community:#{self.class::CATEGORY_KEY}:list:v", raw: true).to_i
    "community:#{self.class::CATEGORY_KEY}:list:v#{v}:#{params.slice(:sort, :q, :page).to_unsafe_h}"
  end

  # Wraps the index action body — executes the block only on cache miss.
  def cached_list(&block)
    Rails.cache.fetch(list_cache_key, expires_in: 5.minutes, &block)
  end

  # Called after any write that changes what the list shows.
  def invalidate_list_cache
    Rails.cache.increment("community:#{self.class::CATEGORY_KEY}:list:v")
  end
end
