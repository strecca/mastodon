# frozen_string_literal: true

# == Schema Information
#
# Table name: admin_action_logs
#
#  id               :bigint           not null, primary key
#  action           :string           default(""), not null
#  human_identifier :string
#  permalink        :string
#  route_param      :string
#  target_type      :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  account_id       :bigint           not null
#  target_id        :bigint
#
# Indexes
#
#  index_admin_action_logs_on_account_id                 (account_id)
#  index_admin_action_logs_on_target_type_and_target_id  (target_type,target_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#

class Admin::ActionLog < ApplicationRecord
  self.ignored_columns += %w(
    recorded_changes
  )

  belongs_to :account
  belongs_to :target, polymorphic: true, optional: true

  before_validation :set_human_identifier
  before_validation :set_route_param
  before_validation :set_permalink

  scope :latest, -> { order(id: :desc) }

  def action
    super.to_sym
  end

  private

  def set_human_identifier
    self.human_identifier = target.to_log_human_identifier if target.respond_to?(:to_log_human_identifier)
  end

  def set_route_param
    self.route_param = target.to_log_route_param if target.respond_to?(:to_log_route_param)
  end

  def set_permalink
    self.permalink = target.to_log_permalink if target.respond_to?(:to_log_permalink)
  end
end
