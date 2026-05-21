# frozen_string_literal: true

class Api::V1::CommunityNotificationPreferencesController < Api::BaseController
  before_action :require_user!

  # GET /api/v1/community_notification_preferences
  def show
    pref = CommunityNotificationPreference.for_account(current_account)
    render json: serialize(pref)
  end

  # PUT /api/v1/community_notification_preferences
  def update
    pref = CommunityNotificationPreference.find_or_initialize_by(account: current_account)
    if pref.update(preference_params)
      render json: serialize(pref)
    else
      render json: { errors: pref.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def preference_params
    params.permit(:email_frequency, :browser_push, :on_visit_overlap, :on_friend_ping, :on_new_member)
  end

  def serialize(pref)
    {
      email_frequency:  pref.email_frequency  || 'daily_digest',
      browser_push:     pref.browser_push     || false,
      on_visit_overlap: pref.on_visit_overlap.nil? ? true  : pref.on_visit_overlap,
      on_friend_ping:   pref.on_friend_ping.nil?   ? true  : pref.on_friend_ping,
      on_new_member:    pref.on_new_member.nil?     ? false : pref.on_new_member,
    }
  end
end
