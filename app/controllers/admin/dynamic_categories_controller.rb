# frozen_string_literal: true

class Admin::DynamicCategoriesController < Admin::BaseController
    def index
      @categories = Dir[DynamicSchemaManager::SCHEMA_DIR.join('*.yml')].map do |f|
        File.basename(f, '.yml')
      end
    end
  
    def new; end
  
    def create
      category = params[:category_name].to_s.strip.parameterize
      return redirect_to admin_dynamic_categories_path, alert: 'Name required' if category.blank?
  
      schema = DynamicSchemaManager.load(category)
      DynamicSchemaManager.save(category, schema)
      redirect_to edit_admin_dynamic_category_path(category), notice: "Category '#{category}' created. Now add fields."
    end
  
    def edit
      @category = params[:id]
      @schema = DynamicSchemaManager.load(@category)
    end
  
    def save_fields
      category = params[:id]
      db_fields = params[:db_fields].permit!.to_h.values  # array of {name, type}
      schema = DynamicSchemaManager.load(category)
      schema['db_fields'] = db_fields
      DynamicSchemaManager.save(category, schema)
  
      render json: { success: true, next_step: 'form_editor' }
    end
  
    def save_form
      category = params[:id]
      schema = DynamicSchemaManager.load(category)
  
      # merge UI metadata into form_config
      schema['form_config'] ||= { 'fields' => [] }
      schema['form_config']['fields'] = params[:form_fields].permit!.to_h.values
  
      DynamicSchemaManager.save(category, schema)
  
      migration_path = DynamicSchemaManager.generate_migration!(schema)
  
      render json: {
        success: true,
        message: "Full model saved. Migration generated: #{migration_path}",
        instruction: 'Run `rails db:migrate` in your terminal to create the table.'
      }
    end
  end