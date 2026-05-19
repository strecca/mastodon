# frozen_string_literal: true

# == Schema Information
#
# Table name: quotes
#
#  id                :bigint           not null, primary key
#  activity_uri      :string
#  approval_uri      :string
#  legacy            :boolean          default(FALSE), not null
#  state             :integer          default("pending"), not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint           not null
#  quoted_account_id :bigint
#  quoted_status_id  :bigint
#  status_id         :bigint           not null
#
# Indexes
#
#  index_quotes_on_account_id_and_quoted_account_id_and_id  (account_id,quoted_account_id,id)
#  index_quotes_on_activity_uri                             (activity_uri) UNIQUE WHERE (activity_uri IS NOT NULL)
#  index_quotes_on_approval_uri                             (approval_uri) WHERE (approval_uri IS NOT NULL)
#  index_quotes_on_quoted_account_id                        (quoted_account_id)
#  index_quotes_on_quoted_status_id_and_id                  (quoted_status_id,id)
#  index_quotes_on_status_id                                (status_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (quoted_account_id => accounts.id) ON DELETE => nullify
#  fk_rails_...  (quoted_status_id => statuses.id) ON DELETE => nullify
#  fk_rails_...  (status_id => statuses.id) ON DELETE => cascade
#
Fabricator(:quote) do
  status { Fabricate.build(:status) }
  quoted_status { Fabricate.build(:status) }
  state :pending
end
