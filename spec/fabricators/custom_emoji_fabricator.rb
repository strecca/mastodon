# frozen_string_literal: true

# == Schema Information
#
# Table name: custom_emojis
#
#  id                           :bigint           not null, primary key
#  disabled                     :boolean          default(FALSE), not null
#  domain                       :string
#  image_content_type           :string
#  image_file_name              :string
#  image_file_size              :integer
#  image_remote_url             :string
#  image_storage_schema_version :integer
#  image_updated_at             :datetime
#  shortcode                    :string           default(""), not null
#  uri                          :string
#  visible_in_picker            :boolean          default(TRUE), not null
#  created_at                   :datetime         not null
#  updated_at                   :datetime         not null
#  category_id                  :bigint
#
# Indexes
#
#  index_custom_emojis_on_shortcode_and_domain  (shortcode,domain) UNIQUE
#
Fabricator(:custom_emoji) do
  shortcode { sequence(:shortcode) { |i| "code_#{i}" } }
  domain    nil
  image     { Rails.root.join('spec', 'fixtures', 'files', 'emojo.png').open }
end
