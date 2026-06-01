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
end
