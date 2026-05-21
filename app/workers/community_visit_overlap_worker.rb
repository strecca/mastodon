# frozen_string_literal: true

# Fired after every community_visit create or update.
#
# Finds all visible visits that overlap the saved visit's date range,
# then cross-checks against the visit owner's follow graph. For each
# connected overlapping visitor, creates an overlap_detected notification
# in both directions — but only if the recipient has on_visit_overlap
# enabled (default: true).
#
# Idempotent: find_or_create_by prevents duplicate notification rows,
# so re-runs on edit are safe.

class CommunityVisitOverlapWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'default', retry: 3

  def perform(visit_id)
    visit = CommunityVisit.includes(:account).find_by(id: visit_id)
    return unless visit
    # Don't notify about fully-past visits
    return if visit.departure_date < Date.current

    owner = visit.account

    overlapping = CommunityVisit
      .visible_to_members
      .overlapping(visit.arrival_date, visit.departure_date)
      .where.not(account_id: owner.id)
      .includes(:account)

    return if overlapping.empty?

    overlap_ids = overlapping.map(&:account_id)

    # Build the two sides of the follow graph in two queries
    following_set = Follow.where(account_id: owner.id, target_account_id: overlap_ids).pluck(:target_account_id).to_set
    follower_set  = Follow.where(account_id: overlap_ids, target_account_id: owner.id).pluck(:account_id).to_set
    connected_ids = following_set | follower_set

    return if connected_ids.empty?

    owner_pref = CommunityNotificationPreference.for_account(owner)

    overlapping.each do |other_visit|
      next unless connected_ids.include?(other_visit.account_id)

      other_account = other_visit.account
      other_pref    = CommunityNotificationPreference.for_account(other_account)

      # → Notify owner: a connection will be in town during your visit
      if owner_pref.on_visit_overlap
        notif = CommunityVisitNotification.find_or_create_by(
          recipient_account_id: owner.id,
          sender_account_id:    other_account.id,
          community_visit_id:   other_visit.id,
          kind:                 :overlap_detected
        )
        CommunityVisitEmailWorker.perform_async(notif.id)
      end

      # → Notify the other person: a connection just announced a visit that overlaps yours
      if other_pref.on_visit_overlap
        notif = CommunityVisitNotification.find_or_create_by(
          recipient_account_id: other_account.id,
          sender_account_id:    owner.id,
          community_visit_id:   visit.id,
          kind:                 :overlap_detected
        )
        CommunityVisitEmailWorker.perform_async(notif.id)
      end
    rescue ActiveRecord::RecordNotUnique
      # Race condition on find_or_create_by — already exists, move on
      next
    end
  end
end
