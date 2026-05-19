# frozen_string_literal: true

# == Schema Information
#
# Table name: preview_cards
#
#  id                           :bigint           not null, primary key
#  author_name                  :string           default(""), not null
#  author_url                   :string           default(""), not null
#  blurhash                     :string
#  description                  :string           default(""), not null
#  embed_url                    :string           default(""), not null
#  height                       :integer          default(0), not null
#  html                         :text             default(""), not null
#  image_content_type           :string
#  image_description            :string           default(""), not null
#  image_file_name              :string
#  image_file_size              :integer
#  image_storage_schema_version :integer
#  image_updated_at             :datetime
#  language                     :string
#  link_type                    :integer
#  max_score                    :float
#  max_score_at                 :datetime
#  provider_name                :string           default(""), not null
#  provider_url                 :string           default(""), not null
#  published_at                 :datetime
#  title                        :string           default(""), not null
#  trendable                    :boolean
#  type                         :integer          default("link"), not null
#  url                          :string           default(""), not null
#  width                        :integer          default(0), not null
#  created_at                   :datetime         not null
#  updated_at                   :datetime         not null
#  author_account_id            :bigint
#  unverified_author_account_id :bigint
#
# Indexes
#
#  index_preview_cards_on_author_account_id                    (author_account_id) WHERE (author_account_id IS NOT NULL)
#  index_preview_cards_on_unverified_author_account_id_and_id  (unverified_author_account_id,id) WHERE (unverified_author_account_id IS NOT NULL)
#  index_preview_cards_on_url                                  (url) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (author_account_id => accounts.id) ON DELETE => nullify
#  fk_rails_...  (unverified_author_account_id => accounts.id) ON DELETE => nullify
#
require 'rails_helper'

RSpec.describe PreviewCard do
  describe 'Validations' do
    describe 'url' do
      it { is_expected.to allow_values('http://example.host/path', 'https://example.host/path').for(:url) }
      it { is_expected.to_not allow_value('javascript:alert()').for(:url) }
    end
  end
end
