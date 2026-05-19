# frozen_string_literal: true
class DynamicSchemaManager
  SCHEMA_DIR = Rails.root.join('config/dynamic_schemas')
  FEATURES_DIR = Rails.root.join('app/javascript/flavours/glitch/features')

  def self.table_name_for(category)
    "community_#{category.pluralize.parameterize.underscore}"
  end

  def self.load(category)
    path = SCHEMA_DIR.join("#{category.parameterize}.yml")
    default = {
      'category_name' => category,
      'table_name'    => table_name_for(category),
      'db_fields'     => [],
      'form_config'   => { 'fields' => [], 'icon' => 'fa-users' }
    }
    return default unless File.exist?(path)

    YAML.safe_load(File.read(path), permitted_classes: [Symbol]) || default
  end

  def self.save(category, schema)
    FileUtils.mkdir_p(SCHEMA_DIR)
    path = SCHEMA_DIR.join("#{category.parameterize}.yml")
    File.write(path, schema.to_yaml)
    path.to_s
  end

  def self.generate_all!(schema)
    category = schema['category_name'].to_s.parameterize.underscore
    table_name = schema['table_name'] || table_name_for(category)

    # Save YAML
    yaml_path = save(category, schema)

    # Generate migration
    migration_path = generate_migration!(schema)

    # Create feature folder with wrapper files
    feature_path = FEATURES_DIR.join("community_#{category}")
    FileUtils.mkdir_p(feature_path)
    generate_per_category_wrappers!(feature_path, category)

    {
      success: true,
      category: category,
      table_name: table_name,
      yaml_path: yaml_path,
      migration: migration_path,
      feature_folder: feature_path.to_s,
      message: "✅ Category '#{category}' fully generated.\nYAML saved to config/dynamic_schemas/#{category}.yml\nMigration created.\nRun `rails db:migrate` to create the table."
    }
  end

  private

  def self.generate_per_category_wrappers!(base_path, category)
    wrappers = {
      'index/index.jsx'    => "import CommunityDirectoryIndex from '../community_directory/index/index';\nexport default CommunityDirectoryIndex;",
      'category/index.jsx' => "import CommunityDirectoryCategory from '../community_directory/category/index';\nexport default CommunityDirectoryCategory;",
      'show/index.jsx'     => "import CommunityDirectoryShow from '../community_directory/show/index';\nexport default CommunityDirectoryShow;",
      'new/index.jsx'      => "import CommunityDirectoryNew from '../community_directory/new/index';\nexport default CommunityDirectoryNew;",
      'edit/index.jsx'     => "import CommunityDirectoryEdit from '../community_directory/edit/index';\nexport default CommunityDirectoryEdit;"
    }

    wrappers.each do |rel_path, content|
      full_path = base_path.join(rel_path)
      FileUtils.mkdir_p(File.dirname(full_path))
      File.write(full_path, content)
    end
  end

  def self.generate_migration!(schema)
    table = schema['table_name']
    timestamp = Time.current.strftime('%Y%m%d%H%M%S')
    migration_name = "create_#{table}"

    path = Rails.root.join("db/migrate/#{timestamp}_#{migration_name}.rb")

    field_lines = schema['db_fields'].map do |f|
      col = f['db_name'] || f['name']
      type = f['type'] || 'string'

      if type.to_s.end_with?('[]')
        base = type.to_s[0..-3]
        "      t.#{base} :#{col}, array: true"
      else
        "      t.#{type} :#{col}"
      end
    end.join("\n")

    content = <<~RUBY
      # frozen_string_literal: true
      class #{migration_name.camelize} < ActiveRecord::Migration[7.1]
        def change
          create_table :#{table} do |t|
            t.references :account, null: false, foreign_key: true
      #{field_lines}
            t.timestamps
          end
        end
      end
    RUBY

    File.write(path, content)
    path.to_s
  end
end