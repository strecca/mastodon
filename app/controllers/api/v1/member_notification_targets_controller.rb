# frozen_string_literal: true

class Api::V1::MemberNotificationTargetsController < Api::BaseController
  before_action :require_user!
  before_action :set_target, only: [:destroy]

  # GET /api/v1/member_notification_targets
  # Returns the accounts the current user always wants to hear from.
  def index
    targets = MemberNotificationTarget.where(account_id: current_account.id)
                                       .includes(:target_account)
                                       .order(:created_at)
    render json: targets.map { |t| serialize(t) }
  end

  # POST /api/v1/member_notification_targets
  # Body: { target_account_id: "123" }
  # Idempotent — returns the existing record if already targeted.
  def create
    target_id = params[:target_account_id].to_i
    target = MemberNotificationTarget.find_or_initialize_by(
      account_id: current_account.id, target_account_id: target_id
    )

    if target.new_record?
      target.save!
      render json: serialize(target), status: :created
    else
      render json: serialize(target)
    end
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Account not found' }, status: :not_found
  end

  # DELETE /api/v1/member_notification_targets/:id
  def destroy
    @target.destroy!
    head :no_content
  end

  private

  def set_target
    @target = MemberNotificationTarget.find_by!(id: params[:id], account_id: current_account.id)
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Not found' }, status: :not_found
  end

  def serialize(target)
    acct = target.target_account
    {
      id:      target.id,
      account: {
        id:           acct.id.to_s,
        username:     acct.username,
        display_name: acct.display_name,
        avatar:       acct.avatar_original_url,
      },
    }
  end
end
