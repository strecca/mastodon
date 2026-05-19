# frozen_string_literal: true

# == Schema Information
#
# Table name: site_uploads
#
#  id                :bigint           not null, primary key
#  blurhash          :string
#  file_content_type :string
#  file_file_name    :string
#  file_file_size    :integer
#  file_updated_at   :datetime
#  meta              :json
#  var               :string           default(""), not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#
# Indexes
#
#  index_site_uploads_on_var  (var) UNIQUE
#
Fabricator(:site_upload) do
  file { Rails.root.join('spec', 'fabricators', 'assets', 'utah_teapot.png').open }
  var { sequence(:var) { |i| "thumbnail_#{i}" } }
end
