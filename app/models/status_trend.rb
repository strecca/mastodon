# frozen_string_literal: true

# == Schema Information
#
# Table name: status_trends
#
#  id         :bigint           not null, primary key
#  allowed    :boolean          default(FALSE), not null
#  language   :string
#  rank       :integer          default(0), not null
#  score      :float            default(0.0), not null
#  account_id :bigint           not null
#  status_id  :bigint           not null
#
# Indexes
#
#  index_status_trends_on_account_id  (account_id)
#  index_status_trends_on_status_id   (status_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (status_id => statuses.id) ON DELETE => cascade
#

class StatusTrend < ApplicationRecord
  include RankedTrend

  belongs_to :status
  belongs_to :account

  scope :allowed, -> { joins('INNER JOIN (SELECT account_id, MAX(score) AS max_score FROM status_trends GROUP BY account_id) AS grouped_status_trends ON status_trends.account_id = grouped_status_trends.account_id AND status_trends.score = grouped_status_trends.max_score').where(allowed: true) }
end
