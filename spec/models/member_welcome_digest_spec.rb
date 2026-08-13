# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MemberWelcomeDigest do
  describe '#content?' do
    it 'is true when content is present and false when nil' do
      expect(Fabricate.build(:member_welcome_digest, content: 'hi').content?).to be true
      expect(Fabricate.build(:member_welcome_digest, content: nil).content?).to be false
    end
  end

  describe '#viewed?' do
    it 'reflects whether viewed_at is set' do
      digest = Fabricate(:member_welcome_digest)
      expect(digest.viewed?).to be false

      digest.view!
      expect(digest.reload.viewed?).to be true
    end
  end

  describe '#view!' do
    it 'sets viewed_at once and does not overwrite it on a second call' do
      digest = Fabricate(:member_welcome_digest)
      digest.view!
      first_viewed_at = digest.reload.viewed_at

      digest.view!
      expect(digest.reload.viewed_at).to eq(first_viewed_at)
    end
  end

  describe '.unviewed' do
    it 'returns only digests with a nil viewed_at' do
      unviewed = Fabricate(:member_welcome_digest)
      viewed   = Fabricate(:member_welcome_digest, viewed_at: Time.current)

      expect(described_class.unviewed).to contain_exactly(unviewed)
      expect(described_class.unviewed).not_to include(viewed)
    end
  end

  it 'enforces one digest per account per day' do
    account = Fabricate(:account)
    Fabricate(:member_welcome_digest, account: account, digest_date: Date.current)

    expect do
      Fabricate(:member_welcome_digest, account: account, digest_date: Date.current)
    end.to raise_error(ActiveRecord::RecordNotUnique)
  end
end
