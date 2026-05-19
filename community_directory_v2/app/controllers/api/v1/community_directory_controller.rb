# app/controllers/api/v1/community_directory_controller.rb
#
# Admin-only API for the Community Directory scaffolding system.
# Lists existing generated categories and creates new ones.

class Api::V1::CommunityDirectoryController < Api::BaseController
  before_action :require_user!
  before_action :require_admin!

  # GET /api/v1/community_directory/categories
  # Returns all tables matching community_* pattern
  def categories
    tables = ActiveRecord::Base.connection.tables
                .select { |t| t.start_with?('community_') && t != 'community_directory' }
                .map do |t|
                  feature_key = t  # e.g. "community_artists"
                  config_path = Rails.root.join('app','javascript','flavours','glitch','features', feature_key, 'config.json')

                  if File.exist?(config_path)
                    config = JSON.parse(File.read(config_path))
                    {
                      name: config['category_key'],
                      display_name: config['display_name'],
                      description: config['description'],
                      icon: config['icon'],
                      table_name: t,
                      entries_count: ActiveRecord::Base.connection.execute("SELECT COUNT(*) FROM #{t}").first['count'],
                    }
                  else
                    {
                      name: t.sub('community_', ''),
                      display_name: t.titleize,
                      description: '',
                      icon: 'category',
                      table_name: t,
                      entries_count: ActiveRecord::Base.connection.execute("SELECT COUNT(*) FROM #{t}").first['count'],
                    }
                  end
                end

    render json: tables
  end

  # POST /api/v1/community_directory/generate
  # Receives the full form config and triggers the generator
  def generate
    config = params.permit(:name, :display_name, :description, :icon,
                           groups: [:name, :label, :columns],
                           fields: [:db_name, :label, :widget, :required, :searchable,
                                    :column, :group, options: []]).to_h

    result = CommunityDirectoryGenerator.new(config).generate!

    if result[:success]
      render json: result, status: :created
    else
      render json: result, status: :unprocessable_entity
    end
  end

  private

  def require_admin!
    render json: { error: 'Admin access required' }, status: :forbidden unless current_account&.admin?
  end
end
