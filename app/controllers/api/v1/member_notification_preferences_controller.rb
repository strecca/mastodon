# frozen_string_literal: true

class Api::V1::MemberNotificationPreferencesController < Api::BaseController
  before_action :require_user!

  # GET /api/v1/member_notification_preferences
  def show
    pref = MemberNotificationPreference.for_account(current_account)
    render json: serialize(pref)
  end

  # PUT /api/v1/member_notification_preferences
  def update
    pref = MemberNotificationPreference.find_or_initialize_by(account: current_account)
    if pref.update(preference_params)
      render json: serialize(pref)
    else
      render json: { errors: pref.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def preference_params
    params.permit(:email_frequency, :quiet_hours_enabled, :quiet_hours_start, :quiet_hours_end, :quiet_hours_timezone)
  end

  def serialize(pref)
    {
      email_frequency:      pref.email_frequency || 'digest',
      quiet_hours_enabled:  pref.quiet_hours_enabled || false,
      quiet_hours_start:    pref.quiet_hours_start&.strftime('%H:%M'),
      quiet_hours_end:      pref.quiet_hours_end&.strftime('%H:%M'),
      quiet_hours_timezone: pref.quiet_hours_timezone || 'UTC',
    }
  end
end
