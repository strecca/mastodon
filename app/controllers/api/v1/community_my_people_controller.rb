# frozen_string_literal: true

class Api::V1::CommunityMyPeopleController < Api::BaseController
  before_action :require_user!
  before_action :set_person, only: [:destroy]

  # GET /api/v1/community_my_people
  # Returns all accounts in the current user's My People group.
  def index
    people = CommunityMyPerson.where(account_id: current_account.id)
                              .includes(:member_account)
                              .order(:created_at)
    render json: people.map { |p| serialize_person(p) }
  end

  # POST /api/v1/community_my_people
  # Adds an account to the current user's My People group.
  # Body: { member_account_id: "123" }
  # Idempotent — returns the existing record if already present.
  def create
    member_id = params[:member_account_id].to_i
    person = CommunityMyPerson.find_or_initialize_by(
      account_id:        current_account.id,
      member_account_id: member_id
    )

    if person.new_record?
      person.save!
      render json: serialize_person(person), status: :created
    else
      render json: serialize_person(person)
    end
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Account not found' }, status: :not_found
  end

  # DELETE /api/v1/community_my_people/:id
  def destroy
    @person.destroy!
    head :no_content
  end

  private

  def set_person
    @person = CommunityMyPerson.find_by!(id: params[:id], account_id: current_account.id)
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Not found' }, status: :not_found
  end

  def serialize_person(person)
    acct = person.member_account
    {
      id:      person.id,
      account: {
        id:           acct.id.to_s,
        username:     acct.username,
        display_name: acct.display_name,
        avatar:       acct.avatar_original_url,
      },
    }
  end
end
