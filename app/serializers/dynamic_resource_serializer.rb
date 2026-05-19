# app/serializers/dynamic_resource_serializer.rb
# frozen_string_literal: true

class DynamicResourceSerializer < ActiveModel::Serializer
    attributes :id, :created_at, :updated_at, :public, :display_name
  
    belongs_to :account, serializer: AccountSerializer
  
    def attributes(*args)
      data = super
  
      # Safe removal of internal columns
      %w[id account_id created_at updated_at].each { |col| data.delete(col.to_sym) }
  
      # Safely add all dynamic fields
      begin
        object.class.column_names.each do |column|
          next if %w[id account_id created_at updated_at].include?(column)
          data[column.to_sym] = object.send(column)
        end
      rescue StandardError => e
        Rails.logger.error "Serializer field error for #{object.class.name}: #{e.message}"
        # Continue with partial data instead of failing
      end
  
      data[:metadata] = safe_metadata
      data[:form_config] = safe_form_config
  
      data
    end
  
    private
  
    def category_name
      object.class.name.underscore.sub(/^community_/, '').singularize
    rescue StandardError
      'unknown'
    end
  
    def safe_metadata
      schema = DynamicSchemaManager.load(category_name)
      fields = schema.dig('form_config', 'fields') || []
  
      fields.map do |field|
        {
          db_name: field['db_name'] || '',
          label: field['label'] || (field['db_name'] || '').humanize,
          widget: field['widget'] || 'text',
          required: field['required'] || false,
          searchable: field['searchable'] || false,
          options: field['options'] || [],
          type: safe_column_type(field['db_name'])
        }
      end
    rescue StandardError => e
      Rails.logger.error "Metadata generation error: #{e.message}"
      []
    end
  
    def safe_form_config
      DynamicSchemaManager.load(category_name)['form_config'] || {}
    rescue StandardError
      {}
    end
  
    def safe_column_type(db_name)
      column = object.class.columns_hash[db_name]
      return nil unless column
      column.array? ? "#{column.type}[]" : column.type.to_s
    rescue StandardError
      'string'
    end
  
    def display_name
      object.try(:title) ||
        object.try(:name) ||
        [object.try(:first_name), object.try(:last_name)].compact.join(' ').presence ||
        "#{object.account&.display_name || 'User'}'s #{category_name.humanize}"
    rescue StandardError
      'Entry'
    end
  
    def public
      object.respond_to?(:public) ? !!object.public : true
    rescue StandardError
      true
    end
  end