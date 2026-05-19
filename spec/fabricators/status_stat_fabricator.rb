# frozen_string_literal: true

# == Schema Information
#
# Table name: status_stats
#
#  id                         :bigint           not null, primary key
#  favourites_count           :bigint           default(0), not null
#  quotes_count               :bigint           default(0), not null
#  reblogs_count              :bigint           default(0), not null
#  replies_count              :bigint           default(0), not null
#  untrusted_favourites_count :bigint
#  untrusted_reblogs_count    :bigint
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#  status_id                  :bigint           not null
#
# Indexes
#
#  index_status_stats_on_status_id  (status_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (status_id => statuses.id) ON DELETE => cascade
#
Fabricator(:status_stat) do
  status
  replies_count '123'
  reblogs_count '456'
  favourites_count '789'
end
