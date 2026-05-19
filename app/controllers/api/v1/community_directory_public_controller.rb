# app/controllers/api/v1/community_directory_public_controller.rb
#
# Public API for the Community Directory landing page.
# Lists all generated community categories so anyone can browse them.
# No authentication required.

class Api::V1::CommunityDirectoryPublicController < Api::BaseController
  skip_before_action :require_authenticated_user!, only: [:index]

  # GET /api/v1/community_directory_public
  # Returns only tables that have a config.json — i.e. generated categories.
  # Internal support tables (permissions, translations, settings) are silently
  # excluded because they have no feature directory.
  def index
    tables = ActiveRecord::Base.connection.tables
               .select { |t| t.start_with?('community_') }
               .sort
               .filter_map { |t| build_category_info(t) }

    render json: tables
  end

  private

  def build_category_info(table_name)
    config_path = Rails.root.join(
      'app', 'javascript', 'flavours', 'glitch', 'features', table_name, 'config.json'
    )
    return nil unless File.exist?(config_path)

    config = JSON.parse(File.read(config_path))
    count  = ActiveRecord::Base.connection.execute(
      "SELECT COUNT(*) AS cnt FROM #{ActiveRecord::Base.connection.quote_table_name(table_name)}"
    ).first['cnt']

    {
      name:          config['category_key'],
      display_name:  config['display_name'],
      description:   config['description'],
      icon:          config['icon'],
      table_name:    table_name,
      route:         "/#{table_name}",
      entries_count: count,
    }
  end
end
