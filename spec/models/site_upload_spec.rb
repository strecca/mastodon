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
require 'rails_helper'

RSpec.describe SiteUpload do
  describe '#cache_key' do
    let(:site_upload) { described_class.new(var: 'var') }

    it 'returns cache_key' do
      expect(site_upload.cache_key).to eq 'site_uploads/var'
    end
  end
end
