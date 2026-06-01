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
    verify_injection!
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
    base = { db_name: f[:db_name], label: f[:label], widget: f[:widget] || 'text',
             required: !!f[:required], searchable: !!f[:searchable],
             duplicate_key: !!f[:duplicate_key], translatable: !!f[:translatable],
             options: Array(f[:options]), column: f[:column] || 'full',
             group: f[:group] || 'default' }
    # Preserve any label_<locale> and placeholder_<locale> keys the admin entered
    locale_keys = f.keys.map(&:to_s).select { |k| k =~ /\A(label|placeholder)_[a-z]{2}\z/ }
    locale_keys.each { |k| base[k] = f[k.to_sym] }
    base
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
            t.integer :status, default: 0, null: false
            t.timestamps
          end

      #{idxs.join("\n")}
          add_index :#{@table_name}, :created_at
          add_index :#{@table_name}, :status
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
      cols = str_search.map { |c| "coalesce(#{c}, '')" }.join(" || ' ' || ")
      "  scope :search, ->(query) { query.blank? ? all : where(\"lower(#{cols}) LIKE ?\", \"%\#{query.downcase}%\") }"
    else
      "  scope :search, ->(_q) { all }"
    end

    write Rails.root.join('app','models',"#{@table_name.singularize}.rb"), <<~RB
      class #{@model_name} < ApplicationRecord
        belongs_to :account
        has_many :entry_translations, class_name: 'CommunityEntryTranslation',
                 as: :translatable, dependent: :destroy

        enum :status, { pending: 0, approved: 1, rejected: 2 }, default: :pending

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

    az_field = @fields.find { |f|
      %w[text select url email].include?(f.deep_symbolize_keys[:widget])
    }&.deep_symbolize_keys&.dig(:db_name) || 'id'

    write Rails.root.join('app','controllers','api','v1',"#{@table_name}_controller.rb"), <<~RB
      class Api::V1::#{@table_name.camelize}Controller < Api::BaseController
        CATEGORY_KEY = '#{@name}'

        before_action :require_user!, only: [:create, :update, :destroy]
        before_action :set_entry, only: [:show, :update, :destroy]
        before_action :authorize_owner!, only: [:update, :destroy]

        def index
          sort_col, sort_dir = case params[:sort]
                               when 'oldest'  then [:created_at, :asc]
                               when 'az'      then [:#{az_field}, :asc]
                               when 'updated' then [:updated_at, :desc]
                               else                [:created_at, :desc]
                               end
          entries = #{@model_name}.includes(:account).search(params[:q])
                      .where(status: :approved)
                      .order(sort_col => sort_dir)
                      .page(params[:page]).per(params[:per_page] || 20)
          render json: { entries: entries.map { |e| serialize(e) },
                         total: entries.total_count, page: entries.current_page, pages: entries.total_pages }
        end

        def show
          render json: serialize(@entry)
        end

        def create
          rate_limit_error = check_rate_limit
          return render json: { error: rate_limit_error }, status: :too_many_requests if rate_limit_error

          entry = #{@model_name}.new(entry_params)
          entry.account = current_account
          entry.status  = auto_approve? ? :approved : :pending

          if entry.save
            CommunityDirectoryMailer.entry_submitted(entry, CATEGORY_KEY).deliver_later unless entry.approved?
            CommunityTranslationWorker.perform_async(entry.class.name, entry.id)
            render json: serialize(entry), status: :created
          else
            render json: { errors: entry.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @entry.update(entry_params)
            CommunityTranslationWorker.perform_async(@entry.class.name, @entry.id)
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

        def set_entry
          @entry = #{@model_name}.find(params[:id])
        end

        def authorize_owner!
          return if @entry.account_id == current_account&.id
          return if current_user&.can?(:administrator)
          return if steward?
          render json: { error: 'Forbidden' }, status: :forbidden
        end

        def steward?
          CommunityDirectoryPermission.exists?(account: current_account, category_key: CATEGORY_KEY, is_steward: true)
        end

        def trusted?
          CommunityDirectoryPermission.exists?(account: current_account, trusted: true, category_key: nil) ||
            CommunityDirectoryPermission.exists?(account: current_account, trusted: true, category_key: CATEGORY_KEY)
        end

        def auto_approve?
          return true if current_user&.can?(:administrator)
          return true if trusted?
          setting = CommunityDirectoryCategorySetting.find_by(category_key: CATEGORY_KEY)
          setting&.requires_approval == false
        end

        def check_rate_limit
          setting = CommunityDirectoryCategorySetting.find_by(category_key: CATEGORY_KEY)
          return nil unless setting&.max_entries_per_account.present?
          return nil if auto_approve?

          window = setting.period_days.present? ? setting.period_days.days.ago : 30.days.ago
          count = #{@model_name}.where(account: current_account, created_at: window..).count
          count >= setting.max_entries_per_account ? "Entry limit reached: \#{setting.max_entries_per_account} per \#{setting.period_days || 30} days." : nil
        end

        def entry_params
          p = params.require(:entry).permit(#{permitted})
      #{jsonb_permit}
          p
        end

        def serialize(e)
          translations = CommunityEntryTranslation
            .where(translatable_type: e.class.name, translatable_id: e.id)
            .each_with_object({}) do |t, h|
              (h[t.locale] ||= {})[t.field_name] = t.translated_text
            end

          { id: e.id, account_id: e.account_id, status: e.status,
            account: { id: e.account.id, username: e.account.username,
                        display_name: e.account.display_name, avatar: e.account.avatar_original_url },
      #{field_serialize}
            translations: translations,
            created_at: e.created_at.iso8601, updated_at: e.updated_at.iso8601 }
        end
      end
    RB
  end

  ASYNC_EXPORT_MARKER = '// [CD:ASYNC_EXPORTS]'
  ASYNC_IMPORT_MARKER = '// [CD:ASYNC_IMPORTS]'
  ROUTE_MARKER        = '{/* [CD:ROUTES] */}'

  # ── Inject async-components.js ───────────────────────────────

  def inject_async_components
    path    = async_path
    content = File.read(path)
    return if content.include?("function #{@pascal_name}")

    raise missing_marker_error('async-components.js', ASYNC_EXPORT_MARKER) unless content.include?(ASYNC_EXPORT_MARKER)

    new_exports = <<~JS

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

    # Insert immediately before the marker so the marker stays at the bottom
    content.sub!(ASYNC_EXPORT_MARKER, "#{new_exports.rstrip}\n\n#{ASYNC_EXPORT_MARKER}")
    File.write(path, content)
    @files_modified << path.to_s
  end

  # ── Inject ui/index.jsx routes ───────────────────────────────

  def inject_ui_routes
    path    = ui_path
    content = File.read(path)
    return if content.include?("#{@pascal_name},")

    raise missing_marker_error('ui/index.jsx', ASYNC_IMPORT_MARKER) unless content.include?(ASYNC_IMPORT_MARKER)
    raise missing_marker_error('ui/index.jsx', ROUTE_MARKER)        unless content.include?(ROUTE_MARKER)

    # Add imports — insert the four new names before the marker comment
    imports = "  #{@pascal_name},\n  #{@pascal_name}Show,\n  #{@pascal_name}New,\n  #{@pascal_name}Edit,\n  #{ASYNC_IMPORT_MARKER}"
    content.sub!(ASYNC_IMPORT_MARKER, imports)

    # Add routes — insert the four new WrappedRoutes before the marker comment
    routes = <<~JSX
                {/* #{@display_name} */}
                <WrappedRoute path='/#{@feature_key}/new' exact component={#{@pascal_name}New} content={children} />
                <WrappedRoute path='/#{@feature_key}/:id/edit' exact component={#{@pascal_name}Edit} content={children} />
                <WrappedRoute path='/#{@feature_key}/:id' exact component={#{@pascal_name}Show} content={children} />
                <WrappedRoute path='/#{@feature_key}' exact component={#{@pascal_name}} content={children} />
                #{ROUTE_MARKER}
    JSX
    content.sub!(ROUTE_MARKER, routes.rstrip)

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

  # ── Post-generation verification ─────────────────────────────
  # Called automatically at the end of generate! to catch silent failures
  # before the admin sees a success message.

  def verify_injection!
    async_content = File.read(async_path)
    ui_content    = File.read(ui_path)

    missing = []
    missing << "#{@pascal_name} export in async-components.js"   unless async_content.include?("function #{@pascal_name} ")
    missing << "#{@pascal_name}Show export in async-components.js" unless async_content.include?("function #{@pascal_name}Show ")
    missing << "#{@pascal_name} import in ui/index.jsx"          unless ui_content.include?("#{@pascal_name},")
    missing << "/#{@feature_key} WrappedRoute in ui/index.jsx"   unless ui_content.include?("path='/#{@feature_key}'")

    return if missing.empty?

    raise "Injection verification failed — these items are missing after generation:\n" \
          "  • #{missing.join("\n  • ")}\n\n" \
          "Check that the injection markers (#{ASYNC_IMPORT_MARKER}, #{ASYNC_EXPORT_MARKER}, #{ROUTE_MARKER}) " \
          "are present in the target files and have not been removed."
  end

  # ── Helpers ──────────────────────────────────────────────────

  def missing_marker_error(filename, marker)
    "Injection marker missing from #{filename}: #{marker}\n" \
    "This marker must be present for the generator to safely insert new routes. " \
    "Check git history or restore the marker manually before generating a new category."
  end

  def run_migration = system('bin/rails db:migrate')

  def write(path, content)
    path = Pathname.new(path) unless path.is_a?(Pathname)
    FileUtils.mkdir_p(path.dirname)
    File.write(path, content)
    @files_created << path.to_s
  end
end
