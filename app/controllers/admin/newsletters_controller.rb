# frozen_string_literal: true

module Admin
  class NewslettersController < ApplicationController
    layout 'admin'

    before_action :authenticate_user!
    before_action :require_admin!
    before_action :set_newsletter, only: [:show, :edit, :update, :destroy, :publish, :unpublish]

    def index
      @newsletters = CommunityNewsletter.order(published_on: :desc, created_at: :desc).page(params[:page]).per(20)
    end

    def show
    end

    def new
      @newsletter = CommunityNewsletter.new(newsletter_template: 'two_column')
    end

    def create
      if params[:import_file].present?
        import_from_file
      else
        @newsletter = CommunityNewsletter.new(newsletter_params)
        if @newsletter.save
          redirect_to edit_admin_newsletter_path(@newsletter), notice: 'Newsletter created. Review and publish when ready.'
        else
          render :new
        end
      end
    end

    def edit
    end

    def update
      if @newsletter.update(newsletter_params)
        redirect_to admin_newsletters_path, notice: 'Newsletter updated.'
      else
        render :edit
      end
    end

    def destroy
      @newsletter.destroy
      redirect_to admin_newsletters_path, notice: 'Newsletter deleted.'
    end

    def publish
      if @newsletter.published?
        redirect_to admin_newsletters_path, alert: 'Already published.'
        return
      end

      @newsletter.update!(status: :published, published_on: @newsletter.published_on || Date.today)
      PostNewsletterWorker.perform_async(@newsletter.id)
      redirect_to admin_newsletters_path, notice: "\"#{@newsletter.title}\" published and queued for posting to the feed."
    end

    def unpublish
      @newsletter.update!(status: :draft)
      redirect_to admin_newsletters_path, notice: "\"#{@newsletter.title}\" moved back to draft."
    end

    private

    def set_newsletter
      @newsletter = CommunityNewsletter.find(params[:id])
    end

    def require_admin!
      return if current_user&.can?(:administrator)
      redirect_to root_path, alert: 'Not authorized.'
    end

    def newsletter_params
      params.require(:community_newsletter).permit(
        :title, :author_name, :published_on, :slug,
        :newsletter_template, :layout_variant, :masthead_location, :footer_attribution,
        :design_tokens,
        :left_column_it, :left_column_en,
        :right_column_it, :right_column_en,
        :source_text, :status
      )
    end

    def import_from_file
      uploaded = params[:import_file]
      suffix   = File.extname(uploaded.original_filename).downcase

      tmp_path = uploaded.tempfile.path

      # For PDF files the service uses pdftotext + pdfimages.
      # For text files it reads the content directly.
      if suffix == '.pdf'
        result = NewsletterImportService.new.extract(pdf_path: tmp_path)
      else
        text   = uploaded.read.force_encoding('UTF-8').encode('UTF-8', invalid: :replace, undef: :replace)
        result = NewsletterImportService.new.extract(source_text: text)
      end

      @newsletter = CommunityNewsletter.new(result[:fields])

      if @newsletter.save
        attach_extracted_images(@newsletter, result[:image_paths])
        redirect_to edit_admin_newsletter_path(@newsletter),
                    notice: "Imported \"#{@newsletter.title}\" - #{result[:image_paths].size} image(s) extracted. Review and publish when ready."
      else
        flash.now[:alert] = "Import succeeded but could not save: #{@newsletter.errors.full_messages.to_sentence}"
        render :new
      end
    rescue NewsletterImportService::Error => e
      flash.now[:alert] = "Import failed: #{e.message}"
      @newsletter = CommunityNewsletter.new
      render :new
    end

    def attach_extracted_images(newsletter, image_paths)
      store_dir = Rails.root.join('public', 'newsletter_assets', newsletter.id.to_s)
      FileUtils.mkdir_p(store_dir)

      image_paths.each_with_index do |meta, i|
        next unless File.exist?(meta[:path])

        ext      = File.extname(meta[:path]).downcase
        filename = "#{meta[:role]}_#{i}#{ext}"
        dest     = store_dir.join(filename)
        FileUtils.cp(meta[:path], dest)

        newsletter.newsletter_assets.create!(
          role:          meta[:role],
          position:      meta[:position],
          alt_text:      meta[:alt_text],
          display_order: i,
          file_path:     "newsletter_assets/#{newsletter.id}/#{filename}"
        )
      end
    end
  end
end
