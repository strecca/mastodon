# frozen_string_literal: true

# Reads the category's config.json at class-load time to build the search
# scope dynamically. Including models must define CATEGORY_KEY.
#
# To make a field searchable: set "searchable": true in config.json and
# restart mastodon-web. The scope updates automatically.
# Then create a migration to rebuild the GIN trigram index on the new
# column set (see db/migrate/*_add_trigram_search_indexes*).
module CommunitySearchable
  extend ActiveSupport::Concern

  SEARCHABLE_WIDGETS = %w[text textarea select radio url email].freeze

  included do
    # Invalidate the list cache whenever status changes (e.g. moderation approve/reject)
    # or an entry is destroyed. Uses a version counter so one INCREMENT clears all
    # page/sort/query variants without a Redis SCAN.
    after_commit :invalidate_list_cache, if: -> { saved_change_to_status? || destroyed? }

    config_path = Rails.root.join(
      'app', 'javascript', 'flavours', 'glitch', 'features',
      "community_#{self::CATEGORY_KEY}", 'config.json'
    )

    searchable_cols = if File.exist?(config_path)
      JSON.parse(File.read(config_path))
          .fetch('fields', [])
          .select { |f| f['searchable'] && SEARCHABLE_WIDGETS.include?(f['widget'].to_s) }
          .map    { |f| f['db_name'] }
    else
      []
    end

    if searchable_cols.any?
      sql_expr = searchable_cols.map { |c| "coalesce(#{c},'')" }.join(" || ' ' || ")
      scope :search, ->(query) {
        next all if query.blank?
        where("lower(#{sql_expr}) LIKE ?", "%#{query.downcase}%")
      }
    else
      scope :search, ->(_q) { all }
    end
  end

  private

  def invalidate_list_cache
    Rails.cache.increment("community:#{self.class::CATEGORY_KEY}:list:v")
  end
end
