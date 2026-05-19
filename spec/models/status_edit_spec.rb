# frozen_string_literal: true

# == Schema Information
#
# Table name: status_edits
#
#  id                           :bigint           not null, primary key
#  content_type                 :string
#  media_descriptions           :text             is an Array
#  ordered_media_attachment_ids :bigint           is an Array
#  poll_options                 :string           is an Array
#  sensitive                    :boolean
#  spoiler_text                 :text             default(""), not null
#  text                         :text             default(""), not null
#  created_at                   :datetime         not null
#  updated_at                   :datetime         not null
#  account_id                   :bigint
#  quote_id                     :bigint
#  status_id                    :bigint           not null
#
# Indexes
#
#  index_status_edits_on_account_id  (account_id)
#  index_status_edits_on_status_id   (status_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => nullify
#  fk_rails_...  (status_id => statuses.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe StatusEdit do
  describe '#reblog?' do
    it 'returns false' do
      record = described_class.new

      expect(record).to_not be_a_reblog
    end
  end
end
