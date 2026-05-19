# app/services/community_directory_updater.rb
#
# Updates an existing generated community category:
#   - Rewrites config.json (labels, placeholders, visibility flags, new fields)
#   - Generates an ALTER TABLE migration for any new DB columns
#   - Rewrites the Rails model (validations + search scope)
#   - Rewrites the Rails controller (permitted params + serialize)
#
# Existing DB columns are never dropped — hide them via show_in_list/show_in_detail
# instead. Widget type changes on existing fields are rejected.

class CommunityDirectoryUpdater
  WIDGET_TO_PG = {
    'text'       => 'string',
    'textarea'   => 'text',
    'select'     => 'string',
    'checkboxes' => 'jsonb',
    'radio'      => 'string',
    'date'       => 'date',
    'url'        => 'string',
    'email'      => 'string',
    'number'     => 'integer',
  }.freeze

  def initialize(category_name, config)
    @name        = category_name.to_s.strip.downcase.gsub(/[^a-z0-9_]/, '')
    @table_name  = "community_#{@name}"
    @model_name  = @table_name.classify
    @pascal_name = "Community#{@name.camelize}"

    c               = config.deep_symbolize_keys
    @display_name   = c[:display_name].presence || "Community #{@name.titleize}"
    @description    = c[:description].to_s
    @icon           = c[:icon].presence || 'category'
    @fields         = Array(c[:fields]).map { |f| normalize_field(f) }
    @groups         = Array(c[:groups])
    @files_created  = []
    @files_modified = []
  end

  def update!
    validate!
    @new_fields = find_new_fields

    write_config_json
    rewrite_react_pages
    create_migration if @new_fields.any?
    rewrite_model
    rewrite_controller
    run_migration if Rails.env.development? && @new_fields.any?

    msg = @new_fields.any? ? 'Schema updated. Restart required: rm -rf public/packs-dev tmp/cache && bin/dev' \
                           : 'Config updated. Vite HMR will pick up the change.'

    { success: true, name: @name, display_name: @display_name,
      new_columns: @new_fields.map { |f| f[:db_name] },
      files_created: @files_created, files_modified: @files_modified,
      message: msg }
  rescue => e
    { success: false, error: e.message, backtrace: e.backtrace&.first(5) }
  end

  private

  # ── Validation ────────────────────────────────────────────────

  def validate!
    raise "Category '#{@name}' does not exist" unless Dir.exist?(feature_path)
    raise 'At least one field is required' if @fields.empty?

    existing = existing_field_types
    @fields.each do |f|
      prior = existing[f[:db_name].to_s]
      next unless prior
      next if prior == f[:widget].to_s

      raise "Cannot change widget type for '#{f[:db_name]}' (was #{prior}, got #{f[:widget]}). " \
            "Remove it from the form and add a new field with a different db_name instead."
    end
  end

  def existing_field_types
    path = feature_path.join('config.json')
    return {} unless File.exist?(path)

    JSON.parse(File.read(path))['fields']
        .each_with_object({}) { |f, h| h[f['db_name']] = f['widget'] }
  end

  def find_new_fields
    existing_cols = begin
      ActiveRecord::Base.connection.columns(@table_name).map(&:name)
    rescue
      []
    end
    @fields.reject { |f| existing_cols.include?(f[:db_name].to_s) }
  end

  # ── Paths ─────────────────────────────────────────────────────

  def glitch_root  = Rails.root.join('app', 'javascript', 'flavours', 'glitch')
  def feature_path = glitch_root.join('features', "community_#{@name}")

  # ── Config JSON ───────────────────────────────────────────────

  def write_config_json
    path = feature_path.join('config.json')
    data = {
      category_key: @name,
      display_name: @display_name,
      description:  @description,
      icon:         @icon,
      table_name:   @table_name,
      api_endpoint: "/api/v1/#{@table_name}",
      fields:       @fields,
      groups:       @groups,
    }
    File.write(path, JSON.pretty_generate(data) + "\n")
    @files_modified << path.to_s
  end

  # ── Migration for new columns only ───────────────────────────

  def create_migration
    ts   = Time.now.utc.strftime('%Y%m%d%H%M%S')
    adds = @new_fields.map do |f|
      pg = WIDGET_TO_PG[f[:widget].to_s] || 'string'
      pg == 'jsonb' ? "    add_column :#{@table_name}, :#{f[:db_name]}, :jsonb, default: []" \
                    : "    add_column :#{@table_name}, :#{f[:db_name]}, :#{pg}"
    end
    idxs = @new_fields.select { |f| f[:searchable] }.map do |f|
      gin = WIDGET_TO_PG[f[:widget].to_s] == 'jsonb' ? ', using: :gin' : ''
      "    add_index :#{@table_name}, :#{f[:db_name]}#{gin}"
    end

    path = Rails.root.join('db', 'migrate', "#{ts}_add_fields_to_#{@table_name}.rb")
    File.write(path, <<~RB)
      class AddFieldsTo#{@table_name.camelize} < ActiveRecord::Migration[7.2]
        def change
      #{(adds + idxs).join("\n")}
        end
      end
    RB
    @files_created << path.to_s
  end

  # ── React page rewrites ───────────────────────────────────────
  # Re-generates the thin-wrapper pages so display_name / title strings stay current.

  def rewrite_react_pages
    overwrite feature_path.join('index.jsx'), page_index
    overwrite feature_path.join('show', 'index.jsx'), page_show
    overwrite feature_path.join('new', 'index.jsx'), page_new
    overwrite feature_path.join('edit', 'index.jsx'), page_edit
  end

  def page_index
    <<~JS
      import { Helmet } from '@unhead/react/helmet';
      import { Column } from 'flavours/glitch/components/column';
      import { ColumnHeader } from 'flavours/glitch/components/column_header';
      import { EntryList } from 'flavours/glitch/components/community_directory/entry_list';
      import config from './config.json';

      const #{@pascal_name} = ({ multiColumn }) => (
        <Column bindToDocument={!multiColumn} label={'#{@display_name}'}>
          <ColumnHeader title={'#{@display_name}'} icon='address-book' multiColumn={multiColumn} showBackButton />
          <EntryList config={config} multiColumn={multiColumn} />
          <Helmet><title>#{@display_name}</title><meta name='robots' content='noindex' /></Helmet>
        </Column>
      );
      export default #{@pascal_name};
    JS
  end

  def page_show
    <<~JS
      import { Helmet } from '@unhead/react/helmet';
      import { Column } from 'flavours/glitch/components/column';
      import { ColumnHeader } from 'flavours/glitch/components/column_header';
      import { EntryDetail } from 'flavours/glitch/components/community_directory/entry_detail';
      import config from '../config.json';

      const #{@pascal_name}Show = ({ params, multiColumn }) => (
        <Column bindToDocument={!multiColumn} label={'#{@display_name}'}>
          <ColumnHeader title={'#{@display_name}'} icon='file-text-o' multiColumn={multiColumn} showBackButton />
          <EntryDetail config={config} entryId={params?.id} multiColumn={multiColumn} />
          <Helmet><title>#{@display_name}</title><meta name='robots' content='noindex' /></Helmet>
        </Column>
      );
      export default #{@pascal_name}Show;
    JS
  end

  def page_new
    <<~JS
      import { Helmet } from '@unhead/react/helmet';
      import { Column } from 'flavours/glitch/components/column';
      import { ColumnHeader } from 'flavours/glitch/components/column_header';
      import { EntryForm } from 'flavours/glitch/components/community_directory/entry_form';
      import config from '../config.json';

      const #{@pascal_name}New = ({ multiColumn }) => (
        <Column bindToDocument={!multiColumn} label={'Add to #{@display_name}'}>
          <ColumnHeader title={'Add to #{@display_name}'} icon='plus' multiColumn={multiColumn} showBackButton />
          <EntryForm config={config} mode='create' multiColumn={multiColumn} />
          <Helmet><title>Add to #{@display_name}</title><meta name='robots' content='noindex' /></Helmet>
        </Column>
      );
      export default #{@pascal_name}New;
    JS
  end

  def page_edit
    <<~JS
      import { Helmet } from '@unhead/react/helmet';
      import { Column } from 'flavours/glitch/components/column';
      import { ColumnHeader } from 'flavours/glitch/components/column_header';
      import { EntryForm } from 'flavours/glitch/components/community_directory/entry_form';
      import config from '../config.json';

      const #{@pascal_name}Edit = ({ params, multiColumn }) => (
        <Column bindToDocument={!multiColumn} label={'Edit — #{@display_name}'}>
          <ColumnHeader title={'Edit — #{@display_name}'} icon='pencil' multiColumn={multiColumn} showBackButton />
          <EntryForm config={config} mode='edit' entryId={params?.id} multiColumn={multiColumn} />
          <Helmet><title>Edit — #{@display_name}</title><meta name='robots' content='noindex' /></Helmet>
        </Column>
      );
      export default #{@pascal_name}Edit;
    JS
  end

  def overwrite(path, content)
    path = Pathname.new(path) unless path.is_a?(Pathname)
    File.write(path, content)
    @files_modified << path.to_s
  end

  # ── Model rewrite ─────────────────────────────────────────────

  def rewrite_model
    vals = @fields.select { |f| f[:required] }
                  .map { |f| "  validates :#{f[:db_name]}, presence: true" }

    str_cols = @fields.select { |f|
      f[:searchable] && %w[text textarea select radio url email].include?(f[:widget].to_s)
    }.map { |f| f[:db_name] }

    scope = if str_cols.any?
      cond = str_cols.map { |c| "#{c} ILIKE :q" }.join(' OR ')
      "  scope :search, ->(query) { query.blank? ? all : where(\"#{cond}\", q: \"%\#{query}%\") }"
    else
      "  scope :search, ->(_q) { all }"
    end

    path = Rails.root.join('app', 'models', "#{@table_name.singularize}.rb")
    File.write(path, <<~RB)
      class #{@model_name} < ApplicationRecord
        belongs_to :account
      #{vals.join("\n")}
      #{scope}
      end
    RB
    @files_modified << path.to_s
  end

  # ── Controller rewrite ────────────────────────────────────────

  def rewrite_controller
    permitted      = @fields.map { |f| ":#{f[:db_name]}" }.join(', ')
    jsonb_fields   = @fields.select { |f| f[:widget].to_s == 'checkboxes' }
    jsonb_permit   = jsonb_fields.map { |f|
      "      p[:#{f[:db_name]}] = params[:entry][:#{f[:db_name]}] if params[:entry][:#{f[:db_name]}].is_a?(Array)"
    }.join("\n")
    field_serialize = @fields.map { |f| "        #{f[:db_name]}: e.#{f[:db_name]}," }.join("\n")

    path = Rails.root.join('app', 'controllers', 'api', 'v1', "#{@table_name}_controller.rb")
    File.write(path, <<~RB)
      class Api::V1::#{@table_name.camelize}Controller < Api::BaseController
        before_action :require_user!, only: [:create, :update, :destroy]
        before_action :set_entry, only: [:show, :update, :destroy]
        before_action :authorize_owner!, only: [:update, :destroy]

        def index
          entries = #{@model_name}.includes(:account).search(params[:q]).order(created_at: :desc)
                      .page(params[:page]).per(params[:per_page] || 20)
          render json: { entries: entries.map { |e| serialize(e) },
                         total: entries.total_count, page: entries.current_page, pages: entries.total_pages }
        end

        def show
          render json: serialize(@entry)
        end

        def create
          entry = #{@model_name}.new(entry_params)
          entry.account = current_account
          if entry.save
            render json: serialize(entry), status: :created
          else
            render json: { errors: entry.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @entry.update(entry_params)
            render json: serialize(@entry)
          else
            render json: { errors: @entry.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @entry.destroy!
          head :no_content
        end

        private

        def set_entry = @entry = #{@model_name}.find(params[:id])

        def authorize_owner!
          render json: { error: 'Forbidden' }, status: :forbidden unless @entry.account_id == current_account&.id || current_user&.can?(:administrator)
        end

        def entry_params
          p = params.require(:entry).permit(#{permitted})
      #{jsonb_permit}
          p
        end

        def serialize(e)
          { id: e.id, account_id: e.account_id,
            account: { id: e.account.id, username: e.account.username,
                        display_name: e.account.display_name, avatar: e.account.avatar_original_url },
      #{field_serialize}
            created_at: e.created_at.iso8601, updated_at: e.updated_at.iso8601 }
        end
      end
    RB
    @files_modified << path.to_s
  end

  def normalize_field(f)
    f = f.deep_symbolize_keys
    {
      db_name:        f[:db_name].to_s.downcase.gsub(/[^a-z0-9_]/, ''),
      label:          f[:label].to_s,
      placeholder:    f[:placeholder].to_s,
      widget:         f[:widget].to_s.presence || 'text',
      required:       !!f[:required],
      searchable:     !!f[:searchable],
      show_in_list:   f.key?(:show_in_list)   ? !!f[:show_in_list]   : true,
      show_in_detail: f.key?(:show_in_detail) ? !!f[:show_in_detail] : true,
      options:        Array(f[:options]),
      column:         f[:column].to_s.presence || 'full',
      group:          f[:group].to_s.presence  || 'default',
    }
  end

  def run_migration = system('bin/rails db:migrate')
end
