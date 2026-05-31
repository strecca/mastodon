class CreateCommunityLandingSettings < ActiveRecord::Migration[8.1]
  def change
    create_table :community_landing_settings do |t|
      t.string :site_name,     null: false, default: 'Centro Comunitario'
      t.string :site_subtitle, null: false, default: 'Mia Civezza al Mare'
      t.text   :tagline,       null: false, default: 'La nostra comunità online — eventi, scambi, artisti e molto altro.'
      t.text   :join_heading,  null: false, default: 'Join the community'
      t.text   :join_body,     null: false, default: 'Mastodon is an open, decentralised social network. Your posts belong to you, not an algorithm. Sign up to post, interact and connect with your neighbours.'
      t.timestamps
    end
  end
end
