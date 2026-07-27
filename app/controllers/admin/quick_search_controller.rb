# frozen_string_literal: true

module Admin
  class QuickSearchController < ApplicationController
    layout 'admin'

    before_action :authenticate_user!
    before_action :require_admin!

    ADMIN_ACTIONS = [
      # ── Community Directory (custom) ──────────────────────────────────

      {
        label: 'Community Directory Dashboard',
        url: '/community_directory',
        category: 'Community Directory',
        description: 'Overview of every category (Artists, Events, Properties, Restaurants, Services) with entry counts and per-category rate-limit / approval settings.',
        caveat: nil,
        keywords: 'dashboard overview categories entries counts rate limit approval',
      },
      {
        label: 'Category Builder — add or edit a category',
        url: '/community_directory/admin',
        category: 'Community Directory',
        description: "Add a brand-new directory category from scratch, or edit an existing one's fields, groups, and layout.",
        caveat: 'Writes real source files and a database migration to disk. In production you must also run a migration, rebuild assets, and restart the app afterward — closer to a mini-deploy than a form save. A category key can never be renamed once created.',
        keywords: 'new category add category edit category fields add field schema generator create category',
      },
      {
        label: 'Moderation Queue',
        url: '/community_directory/moderation',
        category: 'Community Directory',
        description: 'Approve, reject, or delete pending entries across all five categories in one unified queue.',
        caveat: 'Rejecting an entry does not notify the submitter. Deleting is permanent and cannot be undone.',
        keywords: 'approve reject pending entries moderate queue new submission',
      },
      {
        label: 'Entries Manager — Artists',
        url: '/community_directory/entries/artists',
        category: 'Community Directory',
        description: 'Browse every Artists entry (any status: approved, pending, rejected) and delete individual entries.',
        caveat: 'Delete-only, no inline edit, and permanent — cannot be undone.',
        keywords: 'artists delete entry remove listing',
      },
      {
        label: 'Entries Manager — Events',
        url: '/community_directory/entries/events',
        category: 'Community Directory',
        description: 'Browse every Community Event (any status: approved, pending, rejected) and delete individual entries.',
        caveat: 'Delete-only, no inline edit, and permanent — cannot be undone.',
        keywords: 'events delete entry remove listing event',
      },
      {
        label: 'Entries Manager — Properties',
        url: '/community_directory/entries/properties',
        category: 'Community Directory',
        description: 'Browse every Properties entry (any status: approved, pending, rejected) and delete individual entries.',
        caveat: 'Delete-only, no inline edit, and permanent — cannot be undone.',
        keywords: 'properties delete entry remove listing property real estate',
      },
      {
        label: 'Entries Manager — Restaurants',
        url: '/community_directory/entries/restaurants',
        category: 'Community Directory',
        description: 'Browse every Restaurants entry (any status: approved, pending, rejected) and delete individual entries.',
        caveat: 'Delete-only, no inline edit, and permanent — cannot be undone.',
        keywords: 'restaurants delete entry remove listing restaurant',
      },
      {
        label: 'Entries Manager — Services',
        url: '/community_directory/entries/services',
        category: 'Community Directory',
        description: 'Browse every Services entry (any status: approved, pending, rejected) and delete individual entries.',
        caveat: 'Delete-only, no inline edit, and permanent — cannot be undone.',
        keywords: 'services delete entry remove listing service',
      },
      {
        label: 'Trusted / Steward Permissions',
        url: '/community_directory/permissions',
        category: 'Community Directory',
        description: 'Grant an account "Trusted" status (auto-approve their own submissions) or "Steward" status (can approve/reject other people\'s entries in a category) without giving them full admin rights.',
        caveat: 'Leaving the category blank makes the grant global — it applies across every current and future category, not just one.',
        keywords: 'trusted steward auto approve grant permission moderator category',
      },
      {
        label: 'Manage Towns (Locations)',
        url: '/community_directory/locations',
        category: 'Community Directory',
        description: 'Add, remove, reorder, or hide the town options used by the location field on community entries.',
        caveat: 'Removing a town is a hard delete — check nothing still references it first.',
        keywords: 'towns locations location list add town remove town',
      },
      {
        label: 'Scraper Run Logs',
        url: '/community_directory/scraper_logs',
        category: 'Community Directory',
        description: 'Read-only history of the nightly event scrapers (CentroItalia, Comune San Lorenzo, La Voce di Imperia) — fetched / imported / skipped counts and errors per run.',
        caveat: 'Read-only — there is no "run now" button here, that\'s on Site Maintenance below.',
        keywords: 'scraper log history import events nightly run',
      },
      {
        label: 'Site Maintenance (scrapers, vacuum, cleanup)',
        url: '/community_maintenance',
        category: 'Community Directory',
        description: 'Manually run any event scraper now, run the media vacuum now, or bulk-delete old past events, stale listings, past visits, or scraper logs by age.',
        caveat: 'All cleanup actions are permanent and bypass normal delete safeguards (skip model callbacks). Vacuum deletes orphaned media immediately. Admin-only.',
        keywords: 'run scraper now vacuum cleanup delete old events bulk delete disk space media',
      },
      {
        label: 'Community Visits Admin',
        url: '/community_visits/admin',
        category: 'Community Directory',
        description: 'Admin view of every community visit, including private "ghost" visits hidden from other members — searchable, filterable, with a stats panel.',
        caveat: 'This intentionally bypasses the ghost-visibility privacy setting for admins only — by design, not a leak.',
        keywords: 'visits calendar who is visiting ghost private stats',
      },
      {
        label: 'Site Content & Translations',
        url: '/admin/site_settings/edit',
        category: 'Community Directory',
        description: 'Edit almost all hardcoded, translatable site copy — Landing Page, About, Login/Join pages, nav labels, Welcome email, Guide page — across 8 languages, with an auto-translate button per language.',
        caveat: 'Leaving a field blank keeps the existing value rather than clearing it. The Landing Page\'s site name/subtitle/tagline also has a separate editor at /community_directory/landing-settings — editing the wrong one can look like nothing changed.',
        keywords: 'site content edit text translate language copy wording landing page about welcome email guide',
      },
      {
        label: 'Translation Status Dashboard',
        url: '/admin/translation_status',
        category: 'Community Directory',
        description: 'Per-category translation coverage stats across all locales, live Sidekiq queue depth for the translation worker, and a Backfill button per category.',
        caveat: 'Backfill re-queues every entry in that category, even already-translated ones — not incremental, can be a large Sidekiq burst on a big category.',
        keywords: 'translation coverage backfill deepl queue sidekiq missing locale',
      },
      {
        label: 'Community Newsletters',
        url: '/admin/newsletters',
        category: 'Community Directory',
        description: 'Create, edit, publish, or delete community newsletters, including importing one directly from an uploaded PDF (auto-extracted via Claude).',
        caveat: 'Publish posts the newsletter to the live feed immediately — not a draft save. PDF import calls a paid external API per upload.',
        keywords: 'newsletter create edit publish pdf import upload',
      },
      {
        label: 'Regenerate Daily Digest',
        url: '/admin/newsletters',
        category: 'Community Directory',
        description: 'Manually trigger the Daily Digest to regenerate right now, out of its normal nightly cycle.',
        caveat: "Calls the Claude API and takes about 30 seconds. It's the exact same job that runs automatically every night at 05:00 — this just triggers it early. The button is at the top of the Newsletters page.",
        keywords: 'daily digest regenerate rebuild refresh today',
      },

      # ── Stock Mastodon admin (essentials) ───────────────────────────────

      {
        label: 'Dashboard',
        url: '/admin/dashboard',
        category: 'Mastodon Admin',
        description: 'Instance overview — active users, new registrations, software version, and other at-a-glance stats.',
        caveat: nil,
        keywords: 'dashboard overview stats home',
      },
      {
        label: 'Accounts',
        url: '/admin/accounts',
        category: 'Mastodon Admin',
        description: 'Search accounts, approve or reject new registrations, suspend or unsuspend a member, view a profile in detail.',
        caveat: nil,
        keywords: 'accounts members approve registration suspend unsuspend search user',
      },
      {
        label: 'Reports',
        url: '/admin/reports',
        category: 'Mastodon Admin',
        description: 'Review reports members have filed against posts or accounts, and resolve or act on them.',
        caveat: nil,
        keywords: 'reports flagged content complaints moderation',
      },
      {
        label: 'Roles',
        url: '/admin/roles',
        category: 'Mastodon Admin',
        description: "Manage roles and their permissions, and this is where you assign a member the Moderator or Administrator role (via that member's account page, using this role list).",
        caveat: nil,
        keywords: 'roles moderator administrator permissions assign role grant',
      },
      {
        label: 'Invites',
        url: '/admin/invites',
        category: 'Mastodon Admin',
        description: 'Generate invite links to hand out to new members.',
        caveat: nil,
        keywords: 'invite link invitation generate new member sign up',
      },
      {
        label: 'Announcements',
        url: '/admin/announcements',
        category: 'Mastodon Admin',
        description: 'Post a site-wide banner announcement visible to signed-in members.',
        caveat: nil,
        keywords: 'announcement banner notice message everyone',
      },
      {
        label: 'Server Rules',
        url: '/admin/rules',
        category: 'Mastodon Admin',
        description: 'Edit the community guidelines/rules shown to people during sign-up.',
        caveat: nil,
        keywords: 'rules guidelines community standards sign up',
      },
      {
        label: 'Custom Emojis',
        url: '/admin/custom_emojis',
        category: 'Mastodon Admin',
        description: 'Upload or manage custom emoji available across the site.',
        caveat: nil,
        keywords: 'emoji custom upload icon',
      },
      {
        label: 'Warning Presets',
        url: '/admin/warning_presets',
        category: 'Mastodon Admin',
        description: 'Canned warning messages you can send to a member during moderation, so you don\'t have to retype them each time.',
        caveat: nil,
        keywords: 'warning preset canned message moderation template',
      },
      {
        label: 'Moderation Action Log',
        url: '/admin/action_logs',
        category: 'Mastodon Admin',
        description: 'Audit trail of admin/moderator actions taken on the instance.',
        caveat: nil,
        keywords: 'audit log history who did what actions moderator',
      },
      {
        label: 'Terms of Service',
        url: '/admin/terms_of_service',
        category: 'Mastodon Admin',
        description: 'Edit, draft, and publish the Terms of Service / Privacy Policy shown to members.',
        caveat: nil,
        keywords: 'terms of service privacy policy legal edit tos',
      },
      {
        label: 'About Page Settings',
        url: '/admin/settings/about',
        category: 'Mastodon Admin',
        description: "Edit the site's extended About/description text shown to visitors.",
        caveat: nil,
        keywords: 'about page description settings site info',
      },
      {
        label: 'Branding Settings',
        url: '/admin/settings/branding',
        category: 'Mastodon Admin',
        description: 'Edit the site title and thumbnail/branding image used across the instance.',
        caveat: nil,
        keywords: 'branding site title thumbnail logo settings',
      },
      {
        label: 'Registration Settings',
        url: '/admin/settings/registrations',
        category: 'Mastodon Admin',
        description: 'Control how new members can join — open sign-up, approval-required, or invite-only.',
        caveat: 'Switching to fully open registration means anyone can sign up immediately without approval.',
        keywords: 'registration mode sign up open approval invite only settings',
      },
      {
        label: 'Discovery Settings',
        url: '/admin/settings/discovery',
        category: 'Mastodon Admin',
        description: 'Control public timelines, profile directory visibility, and other discoverability options.',
        caveat: nil,
        keywords: 'discovery public timeline directory search visibility settings',
      },
    ].freeze

    def show
      @admin_actions = ADMIN_ACTIONS
    end

    private

    def require_admin!
      return if current_user&.can?(:administrator)

      redirect_to root_path, alert: 'Not authorized.'
    end
  end
end
