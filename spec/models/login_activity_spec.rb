# frozen_string_literal: true

# == Schema Information
#
# Table name: login_activities
#
#  id                    :bigint           not null, primary key
#  authentication_method :string
#  failure_reason        :string
#  ip                    :inet
#  provider              :string
#  success               :boolean
#  user_agent            :string
#  created_at            :datetime
#  user_id               :bigint           not null
#
# Indexes
#
#  index_login_activities_on_user_id  (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe LoginActivity do
  it_behaves_like 'BrowserDetection'

  describe 'Associations' do
    it { is_expected.to belong_to(:user).required }
  end

  describe 'Validations' do
    subject { Fabricate.build :login_activity }

    it { is_expected.to define_enum_for(:authentication_method).backed_by_column_of_type(:string) }
  end
end
