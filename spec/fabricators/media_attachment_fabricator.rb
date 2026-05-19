# frozen_string_literal: true

# == Schema Information
#
# Table name: media_attachments
#
#  id                               :bigint           not null, primary key
#  blurhash                         :string
#  description                      :text
#  file_content_type                :string
#  file_file_name                   :string
#  file_file_size                   :integer
#  file_meta                        :json
#  file_storage_schema_version      :integer
#  file_updated_at                  :datetime
#  processing                       :integer
#  remote_url                       :string           default(""), not null
#  shortcode                        :string
#  thumbnail_content_type           :string
#  thumbnail_file_name              :string
#  thumbnail_file_size              :integer
#  thumbnail_remote_url             :string
#  thumbnail_storage_schema_version :integer
#  thumbnail_updated_at             :datetime
#  type                             :integer          default("image"), not null
#  created_at                       :datetime         not null
#  updated_at                       :datetime         not null
#  account_id                       :bigint
#  scheduled_status_id              :bigint
#  status_id                        :bigint
#
# Indexes
#
#  index_media_attachments_on_account_id_and_status_id  (account_id,status_id DESC)
#  index_media_attachments_on_scheduled_status_id       (scheduled_status_id) WHERE (scheduled_status_id IS NOT NULL)
#  index_media_attachments_on_shortcode                 (shortcode) UNIQUE WHERE (shortcode IS NOT NULL)
#  index_media_attachments_on_status_id                 (status_id)
#
# Foreign Keys
#
#  fk_96dd81e81b  (account_id => accounts.id) ON DELETE => nullify
#  fk_rails_...   (scheduled_status_id => scheduled_statuses.id) ON DELETE => nullify
#  fk_rails_...   (status_id => statuses.id) ON DELETE => nullify
#
Fabricator(:media_attachment) do
  account { Fabricate.build(:account) }

  file do |attrs|
    case attrs[:type]
    when :gifv, :video
      attachment_fixture('attachment.webm')
    else
      attachment_fixture('attachment.jpg')
    end
  end
end
