# frozen_string_literal: true

# == Schema Information
#
# Table name: admin_action_logs
#
#  id               :bigint           not null, primary key
#  action           :string           default(""), not null
#  human_identifier :string
#  permalink        :string
#  route_param      :string
#  target_type      :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  account_id       :bigint           not null
#  target_id        :bigint
#
# Indexes
#
#  index_admin_action_logs_on_account_id                 (account_id)
#  index_admin_action_logs_on_target_type_and_target_id  (target_type,target_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe Admin::ActionLog do
  describe '#action' do
    it 'returns action' do
      action_log = described_class.new(action: 'hoge')
      expect(action_log.action).to be :hoge
    end
  end
end
