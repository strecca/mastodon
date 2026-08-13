# frozen_string_literal: true

class CreateMemberWelcomeDigests < ActiveRecord::Migration[7.2]
  def change
    # One row per account per day. `content` is nullable and that's a real
    # state, not a gap — nil means "we checked, there was nothing new to
    # report," distinct from "not yet generated" (no row at all). The unique
    # index on (account_id, digest_date) is the hard backstop against a
    # duplicate Claude call for the same member on the same day; the worker
    # also guards with AsyncRefresh and a sidekiq-unique-jobs lock before it
    # ever gets here.
    create_table :member_welcome_digests do |t|
      t.references :account, null: false, foreign_key: true
      t.date       :digest_date, null: false
      t.text       :content
      t.datetime   :viewed_at

      t.timestamps
    end

    add_index :member_welcome_digests,
              %i[account_id digest_date],
              unique: true,
              name: 'idx_member_welcome_digests_unique'
  end
end
