# frozen_string_literal: true

class Auth::JoinController < ApplicationController
  layout 'auth'

  before_action :redirect_if_signed_in

  def show; end

  private

  def redirect_if_signed_in
    redirect_to root_path if user_signed_in?
  end
end
