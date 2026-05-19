# frozen_string_literal: true

# == Schema Information
#
# Table name: tag_trends
#
#  id       :bigint           not null, primary key
#  allowed  :boolean          default(FALSE), not null
#  language :string           default(""), not null
#  rank     :integer          default(0), not null
#  score    :float            default(0.0), not null
#  tag_id   :bigint           not null
#
# Indexes
#
#  index_tag_trends_on_tag_id_and_language  (tag_id,language) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (tag_id => tags.id) ON DELETE => cascade
#
class TagTrend < ApplicationRecord
  include RankedTrend

  belongs_to :tag

  scope :allowed, -> { where(allowed: true) }
  scope :not_allowed, -> { where(allowed: false) }
end
