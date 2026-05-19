# frozen_string_literal: true

# == Schema Information
#
# Table name: web_settings
#
#  id         :bigint           not null, primary key
#  data       :json
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :bigint           not null
#
# Indexes
#
#  index_web_settings_on_user_id  (user_id) UNIQUE
#
# Foreign Keys
#
#  fk_11910667b2  (user_id => users.id) ON DELETE => cascade
#

class Web::Setting < ApplicationRecord
  belongs_to :user

  validates :user, uniqueness: true
end
