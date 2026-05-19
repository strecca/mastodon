# frozen_string_literal: true

# == Schema Information
#
# Table name: accounts
#
#  id                            :bigint           not null, primary key
#  actor_type                    :string
#  also_known_as                 :string           is an Array
#  attribution_domains           :string           default([]), is an Array
#  avatar_content_type           :string
#  avatar_description            :string           default(""), not null
#  avatar_file_name              :string
#  avatar_file_size              :integer
#  avatar_remote_url             :string
#  avatar_storage_schema_version :integer
#  avatar_updated_at             :datetime
#  collections_url               :string
#  discoverable                  :boolean
#  display_name                  :string           default(""), not null
#  domain                        :string
#  feature_approval_policy       :integer          default(0), not null
#  featured_collection_url       :string
#  fields                        :jsonb
#  followers_url                 :string           default(""), not null
#  following_url                 :string           default(""), not null
#  header_content_type           :string
#  header_description            :string           default(""), not null
#  header_file_name              :string
#  header_file_size              :integer
#  header_remote_url             :string           default(""), not null
#  header_storage_schema_version :integer
#  header_updated_at             :datetime
#  hide_collections              :boolean
#  id_scheme                     :integer          default("numeric_ap_id")
#  inbox_url                     :string           default(""), not null
#  indexable                     :boolean          default(FALSE), not null
#  last_webfingered_at           :datetime
#  locked                        :boolean          default(FALSE), not null
#  memorial                      :boolean          default(FALSE), not null
#  note                          :text             default(""), not null
#  outbox_url                    :string           default(""), not null
#  private_key                   :text
#  protocol                      :integer          default("ostatus"), not null
#  public_key                    :text             default(""), not null
#  requested_review_at           :datetime
#  reviewed_at                   :datetime
#  sensitized_at                 :datetime
#  shared_inbox_url              :string           default(""), not null
#  show_featured                 :boolean          default(TRUE), not null
#  show_media                    :boolean          default(TRUE), not null
#  show_media_replies            :boolean          default(TRUE), not null
#  silenced_at                   :datetime
#  suspended_at                  :datetime
#  suspension_origin             :integer
#  trendable                     :boolean
#  uri                           :string           default(""), not null
#  url                           :string
#  username                      :string           default(""), not null
#  created_at                    :datetime         not null
#  updated_at                    :datetime         not null
#  moved_to_account_id           :bigint
#
# Indexes
#
#  index_accounts_on_domain_and_id              (domain,id)
#  index_accounts_on_moved_to_account_id        (moved_to_account_id) WHERE (moved_to_account_id IS NOT NULL)
#  index_accounts_on_uri                        (uri)
#  index_accounts_on_url                        (url) WHERE (url IS NOT NULL)
#  index_accounts_on_username_and_domain_lower  (lower((username)::text), COALESCE(lower((domain)::text), ''::text)) UNIQUE
#  search_index                                 ((((setweight(to_tsvector('simple'::regconfig, (display_name)::text), 'A'::"char") || setweight(to_tsvector('simple'::regconfig, (username)::text), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, (COALESCE(domain, ''::character varying))::text), 'C'::"char")))) USING gin
#
# Foreign Keys
#
#  fk_rails_...  (moved_to_account_id => accounts.id) ON DELETE => nullify
#
keypair     = OpenSSL::PKey::RSA.new(2048)
public_key  = keypair.public_key.to_pem
private_key = keypair.to_pem

Fabricator(:account) do
  transient :suspended, :silenced
  username            { sequence(:username) { |i| "#{Faker::Internet.user_name(separators: %w(_))}#{i}" } }
  last_webfingered_at { Time.now.utc }
  public_key          { public_key }
  private_key         { private_key }
  suspended_at        { |attrs| attrs[:suspended] ? Time.now.utc : nil }
  silenced_at         { |attrs| attrs[:silenced] ? Time.now.utc : nil }
  user                { |attrs| attrs[:domain].nil? ? Fabricate.build(:user, account: nil) : nil }
  uri                 { |attrs| attrs[:domain].nil? ? '' : "https://#{attrs[:domain]}/users/#{attrs[:username]}" }
  discoverable        true
  indexable           true
end

Fabricator(:remote_account, from: :account) do
  domain 'example.com'
end
