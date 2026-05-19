# frozen_string_literal: true

# == Schema Information
#
# Table name: tagged_objects
#
#  id          :bigint           not null, primary key
#  ap_type     :string           not null
#  object_type :string
#  uri         :string
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  object_id   :bigint
#  status_id   :bigint           not null
#
# Indexes
#
#  idx_on_status_id_object_type_object_id_d6ebe374bd  (status_id,object_type,object_id) UNIQUE WHERE ((object_type IS NOT NULL) AND (object_id IS NOT NULL))
#  index_tagged_objects_on_object                     (object_type,object_id)
#  index_tagged_objects_on_status_id_and_uri          (status_id,uri) UNIQUE WHERE (uri IS NOT NULL)
#
# Foreign Keys
#
#  fk_rails_...  (status_id => statuses.id) ON DELETE => cascade
#
Fabricator(:tagged_object) do
  status
  object  nil
  ap_type 'FeaturedCollection'
  uri     { Faker::Internet.device_token }
end
