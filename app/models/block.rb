# frozen_string_literal: true

# == Schema Information
#
# Table name: blocks
#
#  id                :bigint           not null, primary key
#  uri               :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint           not null
#  target_account_id :bigint           not null
#
# Indexes
#
#  index_blocks_on_account_id_and_target_account_id  (account_id,target_account_id) UNIQUE
#  index_blocks_on_target_account_id                 (target_account_id)
#
# Foreign Keys
#
#  fk_4269e03e65  (account_id => accounts.id) ON DELETE => cascade
#  fk_9571bfabc1  (target_account_id => accounts.id) ON DELETE => cascade
#

class Block < ApplicationRecord
  include Paginable
  include RelationshipCacheable

  belongs_to :account
  belongs_to :target_account, class_name: 'Account'

  validates :account_id, uniqueness: { scope: :target_account_id }

  def local?
    false # Force uri_for to use uri attribute
  end

  before_validation :set_uri, on: :create
  after_commit :invalidate_blocking_cache
  after_commit :invalidate_follow_recommendations_cache

  private

  def invalidate_blocking_cache
    Rails.cache.delete("exclude_account_ids_for:#{account_id}")
    Rails.cache.delete("exclude_account_ids_for:#{target_account_id}")
  end

  def invalidate_follow_recommendations_cache
    Rails.cache.delete("follow_recommendations/#{account_id}")
  end

  def set_uri
    self.uri = ActivityPub::TagManager.instance.generate_uri_for(self) if uri.nil?
  end
end
