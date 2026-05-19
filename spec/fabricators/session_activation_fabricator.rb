# frozen_string_literal: true

# == Schema Information
#
# Table name: session_activations
#
#  id                       :bigint           not null, primary key
#  ip                       :inet
#  user_agent               :string           default(""), not null
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#  access_token_id          :bigint
#  session_id               :string           not null
#  user_id                  :bigint           not null
#  web_push_subscription_id :bigint
#
# Indexes
#
#  index_session_activations_on_access_token_id  (access_token_id)
#  index_session_activations_on_session_id       (session_id) UNIQUE
#  index_session_activations_on_user_id          (user_id)
#
# Foreign Keys
#
#  fk_957e5bda89  (access_token_id => oauth_access_tokens.id) ON DELETE => cascade
#  fk_e5fda67334  (user_id => users.id) ON DELETE => cascade
#
Fabricator(:session_activation) do
  user { Fabricate.build(:user) }
  session_id { sequence(:session_id) { |i| "session_id_#{i}" } }
end
