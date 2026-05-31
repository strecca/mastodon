# frozen_string_literal: true

class CommunityLandingSetting < ApplicationRecord
  DEFAULTS = {
    site_name:     'Centro Comunitario',
    site_subtitle: 'Mia Civezza al Mare',
    tagline:       'La nostra comunità online — eventi, scambi, artisti e molto altro.',
    join_heading:  'Join the community',
    join_body:     'Mastodon is an open, decentralised social network. Your posts belong to you, not an algorithm. Sign up to post, interact and connect with your neighbours.',
  }.freeze

  def self.instance
    first || create!(DEFAULTS)
  end
end
