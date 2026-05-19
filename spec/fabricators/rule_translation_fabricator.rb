# frozen_string_literal: true

# == Schema Information
#
# Table name: rule_translations
#
#  id         :bigint           not null, primary key
#  hint       :text             default(""), not null
#  language   :string           not null
#  text       :text             default(""), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  rule_id    :bigint           not null
#
# Indexes
#
#  index_rule_translations_on_rule_id_and_language  (rule_id,language) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (rule_id => rules.id) ON DELETE => cascade
#
Fabricator(:rule_translation) do
  text     'MyText'
  hint     'MyText'
  language 'en'
  rule     { Fabricate.build(:rule) }
end
