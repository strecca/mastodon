# frozen_string_literal: true

# == Schema Information
#
# Table name: backups
#
#  id                :bigint           not null, primary key
#  dump_content_type :string
#  dump_file_name    :string
#  dump_file_size    :bigint
#  dump_updated_at   :datetime
#  processed         :boolean          default(FALSE), not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  user_id           :bigint
#
# Indexes
#
#  index_backups_on_user_id  (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id) ON DELETE => nullify
#

class Backup < ApplicationRecord
  belongs_to :user, inverse_of: :backups

  has_attached_file :dump, s3_permissions: ->(*) { ENV['S3_PERMISSION'] == '' ? nil : 'private' }
  validates_attachment_content_type :dump, content_type: /\Aapplication/
end
