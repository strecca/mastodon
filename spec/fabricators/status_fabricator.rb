# frozen_string_literal: true

# == Schema Information
#
# Table name: statuses
#
#  id                           :bigint           not null, primary key
#  content_type                 :string
#  deleted_at                   :datetime
#  edited_at                    :datetime
#  fetched_replies_at           :datetime
#  language                     :string
#  local                        :boolean
#  local_only                   :boolean
#  ordered_media_attachment_ids :bigint           is an Array
#  quote_approval_policy        :integer          default(0), not null
#  reply                        :boolean          default(FALSE), not null
#  sensitive                    :boolean          default(FALSE), not null
#  spoiler_text                 :text             default(""), not null
#  text                         :text             default(""), not null
#  trendable                    :boolean
#  uri                          :string
#  url                          :string
#  visibility                   :integer          default("public"), not null
#  created_at                   :datetime         not null
#  updated_at                   :datetime         not null
#  account_id                   :bigint           not null
#  application_id               :bigint
#  conversation_id              :bigint
#  in_reply_to_account_id       :bigint
#  in_reply_to_id               :bigint
#  poll_id                      :bigint
#  reblog_of_id                 :bigint
#
# Indexes
#
#  index_statuses_20190820                        (account_id,id DESC,visibility,updated_at) WHERE (deleted_at IS NULL)
#  index_statuses_local_20190824                  (id DESC,account_id) WHERE ((local OR (uri IS NULL)) AND (deleted_at IS NULL) AND (visibility = 0) AND (reblog_of_id IS NULL) AND ((NOT reply) OR (in_reply_to_account_id = account_id)))
#  index_statuses_on_account_id                   (account_id)
#  index_statuses_on_conversation_id              (conversation_id)
#  index_statuses_on_deleted_at                   (deleted_at) WHERE (deleted_at IS NOT NULL)
#  index_statuses_on_in_reply_to_account_id       (in_reply_to_account_id) WHERE (in_reply_to_account_id IS NOT NULL)
#  index_statuses_on_in_reply_to_id               (in_reply_to_id) WHERE (in_reply_to_id IS NOT NULL)
#  index_statuses_on_reblog_of_id_and_account_id  (reblog_of_id,account_id)
#  index_statuses_on_uri                          (uri) UNIQUE WHERE (uri IS NOT NULL)
#  index_statuses_public_20250129                 (id DESC,language,account_id) WHERE ((deleted_at IS NULL) AND (visibility = 0) AND (reblog_of_id IS NULL) AND ((NOT reply) OR (in_reply_to_account_id = account_id)))
#
# Foreign Keys
#
#  fk_9bda1543f7  (account_id => accounts.id) ON DELETE => cascade
#  fk_c7fa917661  (in_reply_to_account_id => accounts.id) ON DELETE => nullify
#  fk_rails_...   (in_reply_to_id => statuses.id) ON DELETE => nullify
#  fk_rails_...   (reblog_of_id => statuses.id) ON DELETE => cascade
#
Fabricator(:status) do
  account { Fabricate.build(:account) }
  text 'Lorem ipsum dolor sit amet'

  after_build do |status|
    status.uri = Faker::Internet.device_token if !status.account.local? && status.uri.nil?
  end
end
