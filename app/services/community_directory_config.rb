# frozen_string_literal: true

# Centralizes the "load a community category's config.json" lookup that was
# previously duplicated (with slightly different fallback logic each time)
# across CommunityDirectoryController's moderation/admin/category-info
# endpoints. Categories without their own
# features/community_<key>/config.json (e.g. listings, member stories,
# newsletters, quick shares) fall back to a titleized category key.
class CommunityDirectoryConfig
  class << self
    def config_path(category_key)
      safe = category_key.to_s.strip.downcase.gsub(/[^a-z0-9_]/, '')
      Rails.root.join('app', 'javascript', 'flavours', 'glitch', 'features', "community_#{safe}", 'config.json')
    end

    def config_for(category_key)
      path = config_path(category_key)
      return {} unless File.exist?(path)

      JSON.parse(File.read(path))
    end

    def display_name_for(category_key)
      config_for(category_key)['display_name'] || category_key.to_s.titleize
    end
  end
end
