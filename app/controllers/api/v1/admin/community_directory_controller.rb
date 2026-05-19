class Api::V1::Admin::CommunityDirectoryController < Api::BaseController
    before_action :require_admin!
  
    def create
      name = params[:name].to_s.strip.downcase
      return render json: { error: "Name is required" }, status: :bad_request if name.blank?
  
      result = DynamicSchemaManager.generate_all!({
        'category_name' => name,
        'humanized'     => name.humanize,
        'icon'          => 'fa-users',
        'db_fields'     => [],
        'form_config'   => { 'fields' => [] }
      })
  
      render json: { success: true, category: result }
    rescue => e
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end