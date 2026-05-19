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
class RuleTranslation < ApplicationRecord
  belongs_to :rule

  validates :language, presence: true, uniqueness: { scope: :rule_id }
  validates :text, presence: true, length: { maximum: Rule::TEXT_SIZE_LIMIT }

  scope :for_locale, ->(locale) { where(language: I18n::Locale::Tag.tag(locale).to_a.first) }
  scope :by_language_length, -> { order(Arel.sql('LENGTH(LANGUAGE)').desc) }

  def self.languages
    joins(:rule).merge(Rule.kept).distinct.pluck(:language).sort
  end
end
