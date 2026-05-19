# frozen_string_literal: true

# == Schema Information
#
# Table name: community_entry_translations
#
#  id                :bigint           not null, primary key
#  field_name        :string           not null
#  locale            :string           not null
#  source_digest     :string           not null
#  translatable_type :string           not null
#  translated_text   :text             not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  translatable_id   :bigint           not null
#
# Indexes
#
#  idx_community_translations_by_entry_locale          (translatable_type,translatable_id,locale)
#  idx_community_translations_unique                   (translatable_type,translatable_id,locale,field_name) UNIQUE
#  index_community_entry_translations_on_translatable  (translatable_type,translatable_id)
#
class CommunityEntryTranslation < ApplicationRecord
  belongs_to :translatable, polymorphic: true

  validates :locale, :field_name, :translated_text, :source_digest, presence: true
end
