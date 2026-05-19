# frozen_string_literal: true

# == Schema Information
#
# Table name: bookmarks
#
#  id         :bigint           not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#  status_id  :bigint           not null
#
# Indexes
#
#  index_bookmarks_on_account_id_and_status_id  (account_id,status_id) UNIQUE
#  index_bookmarks_on_status_id                 (status_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (status_id => statuses.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe Bookmark do
  describe 'Associations' do
    it { is_expected.to belong_to(:account).required }
    it { is_expected.to belong_to(:status).required }
  end

  describe 'Validations' do
    subject { Fabricate.build :bookmark }

    it { is_expected.to validate_uniqueness_of(:status_id).scoped_to(:account_id) }
  end

  describe 'Callbacks' do
    describe 'reblog statuses' do
      context 'when status is not a reblog' do
        let(:status) { Fabricate :status }

        it 'keeps status set to assigned value' do
          bookmark = Fabricate.build :bookmark, status: status

          expect { bookmark.valid? }
            .to_not change(bookmark, :status)
        end
      end

      context 'when status is a reblog' do
        let(:original) { Fabricate :status }
        let(:status) { Fabricate :status, reblog: original }

        it 'keeps status set to assigned value' do
          bookmark = Fabricate.build :bookmark, status: status

          expect { bookmark.valid? }
            .to change(bookmark, :status).to(original)
        end
      end
    end
  end
end
