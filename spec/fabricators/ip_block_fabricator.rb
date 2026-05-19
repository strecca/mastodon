# frozen_string_literal: true

# == Schema Information
#
# Table name: ip_blocks
#
#  id         :bigint           not null, primary key
#  comment    :text             default(""), not null
#  expires_at :datetime
#  ip         :inet             default(#<IPAddr: IPv4:0.0.0.0/255.255.255.255>), not null
#  severity   :integer          default(NULL), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_ip_blocks_on_ip  (ip) UNIQUE
#
Fabricator(:ip_block) do
  severity { :sign_up_requires_approval }
  ip { sequence(:ip) { |n| "10.0.0.#{n}" } }
end
