# app/controllers/api/v1/community_directory_public_controller.rb
#
# Public API for the Community Directory landing page.
# Lists all generated community categories so anyone can browse them.
# No authentication required.

class Api::V1::CommunityDirectoryPublicController < Api::BaseController
  skip_before_action :require_authenticated_user!, only: [:index]

  # GET /api/v1/community_directory_public
  # Returns all community_* tables with their config and entry counts
  def index
    tables = ActiveRecord::Base.connection.tables
                .select { |t| t.start_with?('community_') }
                .reject { |t| t == 'community_directory' }
                .sort
                .map { |t| build_category_info(t) }

    render json: tables
  end

  private

  def build_category_info(table_name)
    feature_key = table_name # e.g. "community_artists"
    config_path = Rails.root.join(
      'app', 'javascript', 'flavours', 'glitch', 'features', feature_key, 'config.json'
    )

    count = ActiveRecord::Base.connection.execute(
      "SELECT COUNT(*) AS cnt FROM #{ActiveRecord::Base.connection.quote_table_name(table_name)}"
    ).first['cnt']

    if File.exist?(config_path)
      config = JSON.parse(File.read(config_path))
      {
        name: config['category_key'],
        display_name: config['display_name'],
        description: config['description'],
        icon: config['icon'],
        table_name: table_name,
        route: "/#{feature_key}",
        entries_count: count,
      }
    else
      {
        name: table_name.sub('community_', ''),
        display_name: table_name.titleize,
        description: '',
        icon: 'category',
        table_name: table_name,
        route: "/#{feature_key}",
        entries_count: count,
      }
    end
  end
end
