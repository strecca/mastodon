# frozen_string_literal: true

# == Schema Information
#
# Table name: announcement_reactions
#
#  id              :bigint           not null, primary key
#  name            :string           default(""), not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  account_id      :bigint           not null
#  announcement_id :bigint           not null
#  custom_emoji_id :bigint
#
# Indexes
#
#  index_announcement_reactions_on_account_id_and_announcement_id  (account_id,announcement_id,name) UNIQUE
#  index_announcement_reactions_on_announcement_id                 (announcement_id)
#  index_announcement_reactions_on_custom_emoji_id                 (custom_emoji_id) WHERE (custom_emoji_id IS NOT NULL)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (announcement_id => announcements.id) ON DELETE => cascade
#  fk_rails_...  (custom_emoji_id => custom_emojis.id) ON DELETE => cascade
#

class AnnouncementReaction < ApplicationRecord
  before_validation :set_custom_emoji, if: :name?
  after_commit :queue_publish

  belongs_to :account
  belongs_to :announcement, inverse_of: :announcement_reactions
  belongs_to :custom_emoji, optional: true

  validates :name, presence: true
  validates_with ReactionValidator

  private

  def set_custom_emoji
    self.custom_emoji = CustomEmoji.local.enabled.find_by(shortcode: name)
  end

  def queue_publish
    PublishAnnouncementReactionWorker.perform_async(announcement_id, name) unless announcement.destroyed?
  end
end
