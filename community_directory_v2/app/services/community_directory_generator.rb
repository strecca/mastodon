# app/services/community_directory_generator.rb
#
# Scaffolding engine for the Community Directory system.
# Receives a form config from the admin UI, then physically writes:
#   - React feature pages (thin wrappers around shared components)
#   - config.json (field definitions, layout, groups, filters)
#   - Rails migration, model, and API controller
#   - Injects async-component loaders and routes into existing files
#
# Usage (from controller):
#   result = CommunityDirectoryGenerator.new(config_hash).generate!

class CommunityDirectoryGenerator
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

  attr_reader :name, :display_name, :description, :icon, :fields, :groups,
              :table_name, :model_name, :feature_key, :pascal_name,
              :files_created, :files_modified

  def initialize(config)
    c              = config.deep_symbolize_keys
    @name          = c[:name].to_s.strip.downcase.gsub(/[^a-z0-9_]/, '')
    @display_name  = c[:display_name].presence || "Community #{@name.titleize}"
    @description   = c[:description].to_s
    @icon          = c[:icon].presence || 'category'
    @fields        = Array(c[:fields])
    @groups        = Array(c[:groups])
    @table_name    = "community_#{@name}"
    @model_name    = @table_name.classify
    @feature_key   = "community_#{@name}"
    @pascal_name   = "Community#{@name.camelize}"
    @files_created  = []
    @files_modified = []
  end

  def generate!
    validate!
    create_config_json
    create_react_pages
    create_migration
    create_model
    create_controller
    inject_async_components
    inject_ui_routes
    inject_rails_routes
    inject_web_app_routes
    run_migration if Rails.env.development?

    { success: true, name: @name, display_name: @display_name,
      files_created: @files_created, files_modified: @files_modified,
      message: "Clear cache and restart Vite: rm -rf public/packs-dev tmp/cache && bin/dev" }
  rescue => e
    { success: false, error: e.message, backtrace: e.backtrace&.first(5) }
  end

  private

  # ── Validation ───────────────────────────────────────────────

  def validate!
    raise 'Name is required' if @name.blank?
    raise 'Name must start with a letter and contain only a-z, 0-9, _' unless @name.match?(/\A[a-z][a-z0-9_]*\z/)
    raise 'At least one field is required' if @fields.empty?
    raise "Feature already exists: #{feature_path}" if Dir.exist?(feature_path)
    raise "Migration exists for #{@table_name}" if Dir.glob(Rails.root.join('db','migrate',"*_create_#{@table_name}.rb")).any?
  end

  # ── Paths ────────────────────────────────────────────────────

  def glitch_root  = Rails.root.join('app','javascript','flavours','glitch')
  def feature_path = glitch_root.join('features', @feature_key)
  def async_path   = glitch_root.join('features','ui','util','async-components.js')
  def ui_path      = glitch_root.join('features','ui','index.jsx')

  # ── Config JSON ──────────────────────────────────────────────

  def create_config_json
    data = {
      category_key: @name,
      display_name: @display_name,
      description: @description,
      icon: @icon,
      table_name: @table_name,
      api_endpoint: "/api/v1/#{@table_name}",
      fields: @fields.map { |f| normalize_field(f) },
      groups: @groups,
    }
    write feature_path.join('config.json'), JSON.pretty_generate(data) + "\n"
  end

  def normalize_field(f)
    f = f.deep_symbolize_keys
    { db_name: f[:db_name], label: f[:label], widget: f[:widget] || 'text',
      required: !!f[:required], searchable: !!f[:searchable],
      options: Array(f[:options]), column: f[:column] || 'full',
      group: f[:group] || 'default' }
  end

  # ── React Feature Pages ──────────────────────────────────────
  # These are thin wrappers. The real logic lives in the shared
  # components at components/community_directory/.

  def create_react_pages
    write feature_path.join('index.jsx'), page_index
    write feature_path.join('show','index.jsx'), page_show
    write feature_path.join('new','index.jsx'), page_new
    write feature_path.join('edit','index.jsx'), page_edit
  end

  def page_index
    <<~JS
      import { useIntl } from 'react-intl';
      import { Helmet } from '@unhead/react/helmet';
      import { Column } from 'flavours/glitch/components/column';
      import { ColumnHeader } from 'flavours/glitch/components/column_header';
      import { EntryList } from 'flavours/glitch/components/community_directory/entry_list';
      import config from './config.json';

      const #{@pascal_name} = ({ multiColumn }) => {
        const intl = useIntl();
        return (
          <Column bindToDocument={!multiColumn} label={'#{@display_name}'}>
            <ColumnHeader title={'#{@display_name}'} icon='address-book' multiColumn={multiColumn} showBackButton />
            <EntryList config={config} multiColumn={multiColumn} />
            <Helmet><title>#{@display_name}</title><meta name='robots' content='noindex' /></Helmet>
          </Column>
        );
      };
      export default #{@pascal_name};
    JS
  end

  def page_show
    <<~JS
      import { useIntl } from 'react-intl';
      import { Helmet } from '@unhead/react/helmet';
      import { Column } from 'flavours/glitch/components/column';
      import { ColumnHeader } from 'flavours/glitch/components/column_header';
      import { EntryDetail } from 'flavours/glitch/components/community_directory/entry_detail';
      import config from '../config.json';

      const #{@pascal_name}Show = ({ params, multiColumn }) => {
        return (
          <Column bindToDocument={!multiColumn} label={'#{@display_name}'}>
            <ColumnHeader title={'#{@display_name}'} icon='file-text-o' multiColumn={multiColumn} showBackButton />
            <EntryDetail config={config} entryId={params?.id} multiColumn={multiColumn} />
            <Helmet><title>#{@display_name}</title><meta name='robots' content='noindex' /></Helmet>
          </Column>
        );
      };
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

      const #{@pascal_name}New = ({ multiColumn }) => {
        return (
          <Column bindToDocument={!multiColumn} label={'Add to #{@display_name}'}>
            <ColumnHeader title={'Add to #{@display_name}'} icon='plus' multiColumn={multiColumn} showBackButton />
            <EntryForm config={config} mode='create' multiColumn={multiColumn} />
            <Helmet><title>Add to #{@display_name}</title><meta name='robots' content='noindex' /></Helmet>
          </Column>
        );
      };
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

      const #{@pascal_name}Edit = ({ params, multiColumn }) => {
        return (
          <Column bindToDocument={!multiColumn} label={'Edit — #{@display_name}'}>
            <ColumnHeader title={'Edit — #{@display_name}'} icon='pencil' multiColumn={multiColumn} showBackButton />
            <EntryForm config={config} mode='edit' entryId={params?.id} multiColumn={multiColumn} />
            <Helmet><title>Edit — #{@display_name}</title><meta name='robots' content='noindex' /></Helmet>
          </Column>
        );
      };
      export default #{@pascal_name}Edit;
    JS
  end

  # ── Rails Migration ──────────────────────────────────────────

  def create_migration
    ts = Time.now.utc.strftime('%Y%m%d%H%M%S')

    cols = @fields.map do |f|
      f = f.deep_symbolize_keys
      pg = WIDGET_TO_PG[f[:widget].to_s] || 'string'
      nl = f[:required] ? ', null: false' : ''
      pg == 'jsonb' ? "      t.jsonb :#{f[:db_name]}, default: []#{nl}" : "      t.#{pg} :#{f[:db_name]}#{nl}"
    end

    idxs = @fields.select { |f| f.deep_symbolize_keys[:searchable] }.map do |f|
      f = f.deep_symbolize_keys
      gin = WIDGET_TO_PG[f[:widget].to_s] == 'jsonb' ? ', using: :gin' : ''
      "    add_index :#{@table_name}, :#{f[:db_name]}#{gin}"
    end

    write Rails.root.join('db','migrate',"#{ts}_create_#{@table_name}.rb"), <<~RB
      class Create#{@table_name.camelize} < ActiveRecord::Migration[7.2]
        def change
          create_table :#{@table_name} do |t|
            t.references :account, null: false, foreign_key: true
      #{cols.join("\n")}
            t.timestamps
          end

      #{idxs.join("\n")}
          add_index :#{@table_name}, :created_at
        end
      end
    RB
  end

  # ── Rails Model ──────────────────────────────────────────────

  def create_model
    vals = @fields.select { |f| f.deep_symbolize_keys[:required] }
                  .map { |f| "  validates :#{f.deep_symbolize_keys[:db_name]}, presence: true" }

    str_search = @fields.select { |f|
      fs = f.deep_symbolize_keys
      fs[:searchable] && %w[text textarea select radio url email].include?(fs[:widget].to_s)
    }.map { |f| f.deep_symbolize_keys[:db_name] }

    scope = if str_search.any?
      cond = str_search.map { |c| "#{c} ILIKE :q" }.join(' OR ')
      "  scope :search, ->(query) { query.blank? ? all : where(\"#{cond}\", q: \"%\#{query}%\") }"
    else
      "  scope :search, ->(_q) { all }"
    end

    write Rails.root.join('app','models',"#{@table_name.singularize}.rb"), <<~RB
      class #{@model_name} < ApplicationRecord
        belongs_to :account
      #{vals.join("\n")}
      #{scope}
      end
    RB
  end

  # ── Rails Controller ─────────────────────────────────────────

  def create_controller
    permitted = @fields.map { |f| ":#{f.deep_symbolize_keys[:db_name]}" }.join(', ')
    jsonb_fields = @fields.select { |f| f.deep_symbolize_keys[:widget] == 'checkboxes' }
                          .map { |f| ":#{f.deep_symbolize_keys[:db_name]}" }

    jsonb_permit = if jsonb_fields.any?
      jsonb_fields.map { |jf|
        "      p[#{jf}] = params[:entry][#{jf}] if params[:entry][#{jf}].is_a?(Array)"
      }.join("\n")
    else
      ''
    end

    field_serialize = @fields.map { |f|
      "        #{f.deep_symbolize_keys[:db_name]}: e.#{f.deep_symbolize_keys[:db_name]},"
    }.join("\n")

    write Rails.root.join('app','controllers','api','v1',"#{@table_name}_controller.rb"), <<~RB
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
          render json: { error: 'Forbidden' }, status: :forbidden unless @entry.account_id == current_account&.id || current_account&.admin?
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
  end

  # ── Inject async-components.js ───────────────────────────────

  def inject_async_components
    path = async_path
    content = File.read(path)
    return if content.include?("function #{@pascal_name}")

    content = content.rstrip + <<~JS

      export function #{@pascal_name} () {
        return import('../../#{@feature_key}');
      }

      export function #{@pascal_name}Show () {
        return import('../../#{@feature_key}/show');
      }

      export function #{@pascal_name}New () {
        return import('../../#{@feature_key}/new');
      }

      export function #{@pascal_name}Edit () {
        return import('../../#{@feature_key}/edit');
      }
    JS

    File.write(path, content)
    @files_modified << path.to_s
  end

  # ── Inject ui/index.jsx routes ───────────────────────────────

  def inject_ui_routes
    path = ui_path
    content = File.read(path)
    return if content.include?("#{@pascal_name},")

    # Add imports
    imports = "  #{@pascal_name},\n  #{@pascal_name}Show,\n  #{@pascal_name}New,\n  #{@pascal_name}Edit,"
    content.sub!("} from './util/async-components';", "#{imports}\n} from './util/async-components';")

    # Add routes before /explore
    routes = <<~JSX
                {/* #{@display_name} */}
                <WrappedRoute path='/#{@feature_key}/new' exact component={#{@pascal_name}New} content={children} />
                <WrappedRoute path='/#{@feature_key}/:id/edit' exact component={#{@pascal_name}Edit} content={children} />
                <WrappedRoute path='/#{@feature_key}/:id' exact component={#{@pascal_name}Show} content={children} />
                <WrappedRoute path='/#{@feature_key}' exact component={#{@pascal_name}} content={children} />

    JSX
    content.sub!("<WrappedRoute path='/explore'", "#{routes}            <WrappedRoute path='/explore'")

    File.write(path, content)
    @files_modified << path.to_s
  end

  # ── Inject config/routes/api.rb ───────────────────────────────

  def inject_rails_routes
    path = Rails.root.join('config','routes','api.rb')
    content = File.read(path)
    return if content.include?("resources :#{@table_name}")

    line = "    resources :#{@table_name}, only: [:index, :show, :create, :update, :destroy]\n"
    content.sub!(/namespace :v1 do\n/, "namespace :v1 do\n#{line}")
    File.write(path, content)
    @files_modified << path.to_s
  end

  # ── Inject config/routes/web_app.rb for SPA routing ──────────
  # Without this, direct navigation to /community_artists would 404
  # on the Rails side instead of serving the React SPA.

  def inject_web_app_routes
    path = Rails.root.join('config','routes','web_app.rb')
    content = File.read(path)

    route_entry = "/#{@feature_key}/(*any)"
    return if content.include?(route_entry)

    # Insert our route before the closing ).each line
    content.sub!(
      ").each { |path| get path, to: 'home#index' }",
      "  #{route_entry}\n).each { |path| get path, to: 'home#index' }"
    )
    File.write(path, content)
    @files_modified << path.to_s
  end

  # ── Helpers ──────────────────────────────────────────────────

  def run_migration = system('bin/rails db:migrate')

  def write(path, content)
    path = Pathname.new(path) unless path.is_a?(Pathname)
    FileUtils.mkdir_p(path.dirname)
    File.write(path, content)
    @files_created << path.to_s
  end
end
