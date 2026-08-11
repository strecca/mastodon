# frozen_string_literal: true

class Api::V1::MemberNotificationCategorySubscriptionsController < Api::BaseController
  before_action :require_user!
  before_action :set_subscription, only: [:destroy]

  # GET /api/v1/member_notification_category_subscriptions
  # Returns the current account's subscribed category keys.
  def index
    subs = MemberNotificationCategorySubscription.where(account_id: current_account.id).order(:category_key)
    render json: subs.map { |s| serialize(s) }
  end

  # POST /api/v1/member_notification_category_subscriptions
  # Body: { category_key: "events" }
  # Idempotent — returns the existing record if already subscribed.
  def create
    category_key = params[:category_key].to_s
    return render json: { error: 'category_key is required' }, status: :unprocessable_entity if category_key.blank?

    sub = MemberNotificationCategorySubscription.find_or_initialize_by(
      account_id: current_account.id, category_key: category_key
    )

    if sub.new_record?
      sub.save!
      render json: serialize(sub), status: :created
    else
      render json: serialize(sub)
    end
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
  end

  # DELETE /api/v1/member_notification_category_subscriptions/:id
  def destroy
    @subscription.destroy!
    head :no_content
  end

  private

  def set_subscription
    @subscription = MemberNotificationCategorySubscription.find_by!(id: params[:id], account_id: current_account.id)
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Not found' }, status: :not_found
  end

  def serialize(sub)
    { id: sub.id, category_key: sub.category_key, display_name: CommunityDirectoryConfig.display_name_for(sub.category_key) }
  end
end
