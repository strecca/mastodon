# frozen_string_literal: true

module AccountOwnedConcern
  extend ActiveSupport::Concern

  included do
    # Used to require login here whenever limited_federation_mode? was on,
    # conflating two unrelated things under one setting: which remote
    # servers this instance federates with (still enforced separately, via
    # DomainAllow/DomainBlock -- untouched by this change), and whether a
    # signed-out visitor can view an account/status permalink page.
    # set_account below always resolves a LOCAL account (Account.local.find
    # / Account.find_local!, never overridden to allow remote lookups by
    # any controller that includes this concern -- remote accounts/statuses
    # are handled entirely by separate Redirect::* controllers), so this
    # gate was only ever blocking local content. miacivezza.com has no
    # federation to protect here regardless (confirmed 2026-09-24: this
    # instance is intentionally divorced from the fediverse, local-only)
    # -- removed so a permalink to a local post/profile matches what the
    # front door's Live Posts feed already shows signed-out visitors,
    # instead of dead-ending in a login wall.
    before_action :set_account, if: :account_required?
    before_action :check_account_approval, if: :account_required?
    before_action :check_account_suspension, if: :account_required?
    before_action :check_account_confirmation, if: :account_required?
  end

  private

  def account_required?
    true
  end

  def set_account
    @account = username_param.present? ? Account.find_local!(username_param) : Account.local.find(account_id_param)
  end

  def account_id_param
    params[:account_id]
  end

  def username_param
    params[:account_username]
  end

  def check_account_approval
    not_found if @account.local? && @account.user_pending?
  end

  def check_account_confirmation
    not_found if @account.local? && !@account.user_confirmed?
  end

  def check_account_suspension
    if @account.permanently_unavailable?
      permanent_unavailability_response
    elsif @account.suspended? && !skip_temporary_suspension_response?
      temporary_suspension_response
    end
  end

  def skip_temporary_suspension_response?
    false
  end

  def permanent_unavailability_response
    expires_in(3.minutes, public: true)
    gone
  end

  def temporary_suspension_response
    expires_in(3.minutes, public: true)
    forbidden
  end
end
