# frozen_string_literal: true

# == Schema Information
#
# Table name: reports
#
#  id                         :bigint           not null, primary key
#  action_taken_at            :datetime
#  category                   :integer          default("other"), not null
#  comment                    :text             default(""), not null
#  forwarded                  :boolean
#  rule_ids                   :bigint           is an Array
#  status_ids                 :bigint           default([]), not null, is an Array
#  uri                        :string
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#  account_id                 :bigint           not null
#  action_taken_by_account_id :bigint
#  application_id             :bigint
#  assigned_account_id        :bigint
#  target_account_id          :bigint           not null
#
# Indexes
#
#  index_reports_on_account_id                  (account_id)
#  index_reports_on_action_taken_by_account_id  (action_taken_by_account_id) WHERE (action_taken_by_account_id IS NOT NULL)
#  index_reports_on_assigned_account_id         (assigned_account_id) WHERE (assigned_account_id IS NOT NULL)
#  index_reports_on_target_account_id           (target_account_id)
#
# Foreign Keys
#
#  fk_4b81f7522c  (account_id => accounts.id) ON DELETE => cascade
#  fk_bca45b75fd  (action_taken_by_account_id => accounts.id) ON DELETE => nullify
#  fk_eb37af34f0  (target_account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...   (application_id => oauth_applications.id) ON DELETE => nullify
#  fk_rails_...   (assigned_account_id => accounts.id) ON DELETE => nullify
#

class Report < ApplicationRecord
  include Paginable
  include RateLimitable

  COMMENT_SIZE_LIMIT = 1_000

  rate_limit by: :account, family: :reports

  belongs_to :account
  belongs_to :application, class_name: 'Doorkeeper::Application', optional: true

  with_options class_name: 'Account' do
    belongs_to :target_account
    belongs_to :action_taken_by_account, optional: true
    belongs_to :assigned_account, optional: true
  end

  has_many :collection_reports, dependent: :delete_all
  has_many :collections, through: :collection_reports
  has_many :notes, class_name: 'ReportNote', inverse_of: :report, dependent: :destroy
  has_many :notifications, as: :activity, dependent: :destroy

  scope :unresolved, -> { where(action_taken_at: nil) }
  scope :resolved,   -> { where.not(action_taken_at: nil) }
  scope :with_accounts, -> { includes([:account, :target_account, :action_taken_by_account, :assigned_account].index_with([:account_stat, { user: [:invite_request, :invite, :ips] }])) }

  # A report is considered local if the reporter is local
  delegate :local?, to: :account

  validates :comment, length: { maximum: COMMENT_SIZE_LIMIT }, if: :local?
  validates :rule_ids, absence: true, if: -> { (category_changed? || rule_ids_changed?) && !violation? }

  validate :validate_rule_ids, if: -> { (category_changed? || rule_ids_changed?) && violation? }

  # entries here need to be kept in sync with the front-end:
  # - app/javascript/mastodon/features/notifications/components/report.jsx
  # - app/javascript/mastodon/features/report/category.jsx
  # - app/javascript/mastodon/components/admin/ReportReasonSelector.jsx
  enum :category, {
    other: 0,
    spam: 1_000,
    legal: 1_500,
    violation: 2_000,
  }

  before_validation :set_uri, on: :create

  after_create_commit :trigger_create_webhooks
  after_update_commit :trigger_update_webhooks

  def object_type
    :flag
  end

  def statuses
    Status.with_discarded.where(id: status_ids)
  end

  def media_attachments_count
    statuses_to_query = []
    count = 0

    statuses.pluck(:id, :ordered_media_attachment_ids).each do |id, ordered_ids|
      if ordered_ids.nil?
        statuses_to_query << id
      else
        count += ordered_ids.size
      end
    end

    count += MediaAttachment.where(status_id: statuses_to_query).count unless statuses_to_query.empty?
    count
  end

  def rules
    Rule.with_discarded.where(id: rule_ids)
  end

  def assign_to_self!(current_account)
    update!(assigned_account_id: current_account.id)
  end

  def unassign!
    update!(assigned_account_id: nil)
  end

  def resolve!(acting_account)
    update!(action_taken_at: Time.now.utc, action_taken_by_account_id: acting_account.id)
  end

  def unresolve!
    update!(action_taken_at: nil, action_taken_by_account_id: nil)
  end

  def action_taken?
    action_taken_at.present?
  end

  alias action_taken action_taken?

  def unresolved?
    !action_taken?
  end

  def unresolved_siblings?
    Report.where.not(id: id).where(target_account_id: target_account_id).unresolved.exists?
  end

  def to_log_human_identifier
    id
  end

  def history
    subquery = [
      Admin::ActionLog.where(
        target_type: 'Report',
        target_id: id
      ).arel,

      Admin::ActionLog.where(
        target_type: 'Account',
        target_id: target_account_id
      ).arel,

      Admin::ActionLog.where(
        target_type: 'Status',
        target_id: status_ids
      ).arel,

      Admin::ActionLog.where(
        target_type: 'AccountWarning',
        target_id: AccountWarning.where(report_id: id).select(:id)
      ).arel,
    ].reduce { |union, query| Arel::Nodes::UnionAll.new(union, query) }

    Admin::ActionLog.latest.from(Arel::Nodes::As.new(subquery, Admin::ActionLog.arel_table))
  end

  private

  def set_uri
    self.uri = ActivityPub::TagManager.instance.generate_uri_for(self) if uri.nil? && account.local?
  end

  def validate_rule_ids
    errors.add(:rule_ids, I18n.t('reports.errors.invalid_rules')) unless rules.size == rule_ids&.size
  end

  def trigger_create_webhooks
    TriggerWebhookWorker.perform_async('report.created', 'Report', id)
  end

  def trigger_update_webhooks
    TriggerWebhookWorker.perform_async('report.updated', 'Report', id)
  end
end
