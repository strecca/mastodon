# How miacivezza.com Is Wired

Written 2026-09-22. This is the current, verified map of how the live site works end to end —
request path, real-time updates, background jobs, email, translation, auth, deployment, and the
traps that have actually bitten this site. Everything here was re-read from the code on the date
above (or verified live against production), not carried over from memory.

Two documents already exist and are **not** duplicated here:

- **`docs/CLAUDE.md`** — the original Community Directory design doc (May 2026). Still the right
  place for the *conceptual* model (config.json schema, the generator, the thin-wrapper
  pattern). Some of its operational details (dev workflow, GitHub repo) are stale — trust this
  file over that one for anything about the live server.
- **`docs/ADMIN_OPERATIONS.md`** — the step-by-step runbook (SSH commands, systemctl, Caddy).
  This document explains *why* those steps are what they are; that one is the checklist to
  actually run.

If something here turns out to be wrong or has drifted, fix this file in the same commit as the
code change that made it wrong. A document that isn't kept current is worse than no document.

---

## 1. What this site is

A closed, invite-only community platform for the village of Civezza, Liguria, built on
**Mastodon glitch-soc** (fork of glitch-soc, itself a fork of Mastodon) with a large custom
**Community Directory** system layered on top: categories like Listings, Events, Artists,
Services, Restaurants, Properties, Member Stories, plus Daily Digest, Newsletters, and Community
Visits. It is not federated — no other Fediverse server talks to it — which simplifies a lot
(see §9, queues).

Stack: Ruby on Rails (Puma) · PostgreSQL · Redis (Valkey) · a separate Node.js streaming server ·
React 18 + Redux (Immutable.js) · Vite build · Caddy as the front door · Hetzner VPS, deployed by
`git pull` + restart (no Docker, no CI/CD pipeline — see §10).

---

## 2. Request path: browser → Caddy → Rails / streaming

One Caddy site block (`dist/Caddyfile`, the canonical copy; the live one is
`/etc/caddy/Caddyfile`) fronts everything on port 443. It routes by path, in this order:

| Path | Handled by | Notes |
|---|---|---|
| `/system/*` | Caddy, straight from disk | Uploaded media (avatars, photos) — never touches Rails |
| `/packs/*` | Caddy, straight from disk | Compiled JS/CSS, `Cache-Control: public, max-age=31536000, immutable` — safe because Vite hashes filenames |
| `/packs-dev/*` | Caddy, straight from disk | Dev-only build output; present on the server but unused in production |
| `/api/v1/streaming*`, `/api/v2/streaming*` | reverse\_proxy → `localhost:4000` | The Node streaming server (§4), with `Upgrade`/`Connection` headers forwarded for the WebSocket handshake |
| `/sw.js` | Caddy, from `public/packs/sw.js` specifically (not plain `public/`) | `Cache-Control: no-store` — must never be cached, see §5 |
| everything else | reverse\_proxy → `localhost:3000` | Puma running the Rails app |

Two hard-won details worth knowing:

- **`/sw.js`'s root is `public/packs`, not `public`.** Vite deliberately outputs the service
  worker unhashed to `public/packs/sw.js` (a stable URL the browser can keep re-checking), but
  the app registers it from `/sw.js` at the site root so its scope covers the whole site. This
  Caddy block bridges that gap. It pointed at the wrong root from whenever it was first added
  until 2026-09-18 — meaning `/sw.js` 404'd for every visitor, and the service worker had
  probably never registered for anyone, ever, until that fix. See §5.
- **Caddy logs `remote_ip` at `/var/log/caddy/access.log`** (JSON, auto-rotated at 10MB / keeps
  10 files / 30 days). Rails' own request log does *not* record the real client IP, so this is
  the only forensic trail for attributing traffic to a source — added 2026-09-06 after a
  scanning investigation. See §11 for how to read it.

**Rails (Puma):** `config/puma.rb` — `WEB_CONCURRENCY=2` workers, `MAX_THREADS=5` per worker
(env-overridable), bound to `127.0.0.1:3000` via systemd unit `mastodon-web`
(`ExecStart=bundle exec puma -C config/puma.rb`, `WorkingDirectory=/home/mastodon/live`).

**Streaming (Node):** systemd unit `mastodon-streaming` runs `node index.js` directly out of
`streaming/`, bound to port 4000. It is a genuinely separate process from Rails — restarting
`mastodon-web` does **not** restart it, and a change to `streaming/index.js` needs its own
`systemctl restart mastodon-streaming` (easy to forget; see §10).

---

## 3. Frontend architecture (glitch flavour)

All JS lives under `app/javascript/`, in two parallel trees: `mastodon/` (vanilla upstream) and
`flavours/glitch/` (this fork's version — always work here, never in `mastodon/`). Vanilla files
still exist because glitch-soc mirrors upstream's file layout rather than replacing it; several
of them are dead code on this fork (see the Storybook fixes below for what that costs in tests).

- **State:** Redux with Immutable.js. Root state is an `ImmutableRecord`, so both `state.foo` and
  `state.get('foo')` work. Store setup: `flavours/glitch/store/`; always import
  `useAppSelector`/`useAppDispatch` from there, never from `react-redux` directly.
- **Routing (three-layer lazy-loading):** `features/ui/util/async-components.js` (registry of
  `() => import(...)` factories) → `features/ui/index.jsx` (`<WrappedRoute>` per path, more
  specific paths before less specific ones) → `<Bundle>` executes the import on mount and passes
  `params` (from react-router, not hooks) and `multiColumn` to the page component.
- **Identity:** `identity_context.tsx` — `createIdentityContext(state)` reads
  `signedIn: !!state.meta.me`, `accountId: state.meta.me`, `permissions: state.role?.permissions`
  straight from the page's embedded initial state (§8), not a separate API call.
  `useIdentity()` hook / `withIdentity` HOC for class components.
- **The Community Directory pattern:** one generic Redux reducer/actions module
  (`reducers/community_entries.js`, `actions/community_entries.js`) drives every generated
  category via a `categoryKey`; generated page files are 15–20 line thin wrappers around shared
  components (`components/community_directory/entry_list.jsx`, `entry_detail.jsx`,
  `entry_form.jsx`, `entry_card.jsx`) parameterized by each category's `config.json`. Full detail
  in `docs/CLAUDE.md` §2–8 — still accurate.
- **Hand-built (non-generated) community features:** Listings (`features/community_listings/`)
  and Events have their own reducers/actions (`reducers/community_listings.js`,
  `actions/community_listings.js`) rather than the generic layer, because they predate or need
  behavior the generator doesn't provide (interest queues, calendar views). Member Stories,
  Quick Shares, Newsletters, Daily Digest are similarly hand-built, simple `useState`+`api()`
  components with no Redux involvement at all.

---

## 4. Real-time: how a page finds out something changed

There are **two independent mechanisms**, and they cover different gaps. Both were substantially
rebuilt 2026-09-20/21 after discovering the original one only worked for two of the ~12
categories and never handled deletions at all.

### 4a. Live push (instant, signed-in only)

1. A member creates, edits, or deletes something. The write goes through a model-level concern,
   **`CommunityLiveRefresh`** (`app/models/concerns/community_live_refresh.rb`), included either
   directly on a model or transitively via `CommunitySearchable` (which every generated category
   model includes). An `after_commit` hook on create/update/destroy calls
   `CommunityDirectoryRefreshWorker.schedule("community:<category_key>")`.
2. The worker (`app/workers/community_directory_refresh_worker.rb`) takes a Redis `NX` lock per
   channel for 35 seconds so a burst of writes collapses into one push, waits 30s
   (`perform_in`), then publishes `{event: "refresh"}` to `timeline:community:<key>` over Redis
   pub/sub.
3. The Node streaming server is subscribed to `timeline:*` channels and forwards the message to
   every WebSocket client subscribed to `community:<key>`. Channel matching is a regex
   (`/^community:[a-z][a-z0-9_]{0,39}$/` in `streaming/index.js`), not a hard-coded list — any
   category, including ones generated after this was written, gets a channel automatically.
4. In the browser, `hooks/useCommunityLiveRefresh.ts` holds the subscription (via
   `stream.js`/`connectStream`) and calls the page's own refresh callback when a `refresh` event
   arrives. **This requires an access token — signed-out visitors get no live push at all.**
   Bulk `delete_all` maintenance actions (stale-listing sweep, etc.) skip Active Record callbacks
   entirely, so `community_maintenance_controller.rb` calls `.schedule` explicitly after each one.

### 4b. Wake-up refresh (catches everyone, including signed-out and frozen tabs)

The gap live push can't cover: a phone's PWA that's been asleep in the background, or a
signed-out visitor, never receives the WebSocket message — there's no connection to receive it
on. `useCommunityLiveRefresh` also listens for `visibilitychange`/`pageshow`/`focus`/`online` and
re-runs the refresh callback (throttled to once per 15s) whenever the app comes back to the
foreground, independent of whether a live connection exists. Pass `{ stream: false }` for a page
that already manages its own stream elsewhere (the Live Posts / Home timelines, below).

For **timelines** (Live Posts, Home, lists, hashtags — Mastodon's own post feeds, not the
Community Directory), the wake-up side does more than re-fetch: `refreshTimeline()`
(`actions/timelines.js`) fetches the newest 20 posts and **removes any post the server no longer
returns**, so a post deleted while the tab was frozen actually disappears instead of lingering.
It only removes posts inside the range the fresh page covers (so a post that just arrived over
the live stream is never mistaken for deleted), and a 206 ("feed still rebuilding") or failed
fetch changes nothing. Wired into Firehose (`features/firehose/` — serves `/public/local`,
`/public`, `/public/remote`, **not** `features/community_timeline`, which is only the deck-column
version of the same feed), Home, list, and hashtag timelines via a shared
`features/ui/components/timeline_wake_refresh.tsx`.

**What's still not covered:** profile/account timelines have no wake-up refresh yet. Signed-out
visitors never get instant updates on any page, only the wake-up refresh.

---

## 5. Service worker & the update mechanism

Confirmed via live device testing (Sep 18–20) that this had likely never fully worked for any
visitor before that week — see §2 for the Caddy root bug and below for the build bug. Both are
fixed and independently verified on real phones.

- **Build stamping:** `vite.config.mts` injects `__BUILD_ID__` (via `define`) — the current git
  short SHA at build time, or `BUILD_ID` env, or `"dev"`. `sw.ts` holds it in `BUILD_ID` and
  answers a `GET_BUILD_ID` postMessage with it. Because it changes on every deploy, `sw.js`'s
  bytes differ every time, which is what actually makes the browser notice a new version exists
  — browsers only re-check a service worker by comparing bytes.
- **Detection, two independent signals** (`flavours/glitch/utils/app_update.ts`):
  `registration.update()` (checks `registration.waiting` + `registration.active`, deliberately
  **not** `navigator.serviceWorker.controller`, which can be undefined right after a fresh
  registration even though the worker is fully active), and a direct
  `fetch("/sw.js", {cache: "no-store"})` whose text is checked for the current build id — this
  second path works even with no service worker registered at all.
- **When it checks:** on mount, every 5 minutes while open, and on
  `visibilitychange`/`pageshow`/`focus`/`online` (throttled 15s) — the wake events are the ones
  that actually matter on iOS, which freezes background pages so timers never fire.
  `ServiceWorkerUpdateNotice` (mounted in `features/ui/index.jsx`) shows the "Update ready" alert
  and applies the update on click (`SKIP_WAITING` → `controllerchange` → reload).
  **Gotcha fixed 2026-09-20:** a brand-new visitor's page also fires `controllerchange` a few
  seconds after load (the first worker claiming the page), which the old code mistook for a
  real update and reloaded mid-visit; fixed by only treating it as an update if the page had a
  controller *when it loaded*.
- **Manual button:** `features/navigation_panel/components/check_for_updates_button.tsx`, a
  large green button under "Daily Digest" in the nav panel, visible signed in or out. Does the
  same check on demand.
- **What the service worker caches** (`service_worker/caching.ts`): images (cache-first, 7-day
  TTL, max 5 entries), locale JS chunks and fonts (30-day TTL). It does **not** cache API
  responses or app HTML. "A deleted photo still loads on my phone" is this image cache or Safari's
  own cache, not stale app code — see §4b for what actually removes a deleted post from view.

**Deploy hygiene this depends on:** a production Vite build never empties its own output
directory (`emptyOutDir: mode !== 'production'`), so old JS chunks from previous deploys stay on
disk and stay servable. **Never delete `public/packs` on deploy** — doing so 404s anyone who
already has an older page open, on the very next lazy-loaded chunk they need (this broke the
site for real visitors on 2026-09-18 and again on 2026-09-20 before the recipe was fixed). Only
`rm -rf tmp/cache/vite` (Vite's own build cache, never shipped to a browser) should ever be
wiped. See `docs/ADMIN_OPERATIONS.md` §2.

---

## 6. The Community Directory: category data + generator

Full architecture in `docs/CLAUDE.md` (still accurate for the conceptual model — config.json
schema, generator internals, permissions, thin-wrapper pattern). Summary of what matters for
day-to-day work:

- **Generator** (`app/services/community_directory_generator.rb`) writes real files to disk from
  an admin form: a migration, a model, a controller, four thin React page wrappers, and injects
  routes into `config/routes/api.rb`, `config/routes/web_app.rb`,
  `features/ui/util/async-components.js`, `features/ui/index.jsx`. It's a one-time codegen step,
  not a runtime dynamic-rendering system.
- **Every generated model** includes `CommunitySearchable` (builds an `ILIKE` search scope from
  `config.json`'s `searchable` fields) which in turn includes `CommunityLiveRefresh` (§4a) — so
  push and search both come for free from the generator.
- **List-page caching:** `CommunityCacheable` concern wraps an index action's body in
  `Rails.cache.fetch(..., expires_in: 5.minutes)`, keyed with a version counter
  (`community:<key>:list:v<N>`) that a single Redis `INCREMENT` invalidates entirely — avoids a
  Redis `SCAN` across every page/sort/query combination. `invalidate_list_cache` is called after
  any write that changes what a list shows.
- **Ownership:** every entry has `account_id`; edit/delete is gated to
  `entry.account_id == current_account.id || current_account.admin?`, checked both in the Rails
  controller and in the shared React `EntryDetail` component (via `identity.accountId`).
- **Not generator-made** (hand-built, own controllers/models): `CommunityListing`,
  `CommunityVisit` + `VisitAvailability`, `CivezzaMemberStory`, `CommunityQuickShare`,
  `CommunityNewsletter`, `CommunityDailyDigest`.

---

## 7. Background jobs (Sidekiq)

Closed-community simplification: `config/sidekiq.yml` explicitly removes the federation-only
queues (`push`, `ingress`, `pull`, `fasp`), Elasticsearch indexing, trends, and follow
recommendations — there is no Fediverse traffic to process. `concurrency: 5`. Queues, in weighted
order: `default` (8), `mailers` (2), `scheduler` (unweighted), `low` (1).

**Death alerting:** `config/initializers/sidekiq_callbacks.rb` registers a
`death_handlers` hook that fires `AdminAlertMailer.job_died` — but only for jobs whose class is
in `SIDEKIQ_ALERTABLE_WORKERS`. Every other worker's failure (including stock Mastodon workers)
is silently ignored by design; the comment in that file explains built-in scheduler noise isn't
worth an email. If you add a new worker whose failure should page someone, add it to that list.

**19 custom workers** — grouped by what they're for:

*Community Directory / categories:* `CommunityDirectoryRefreshWorker` (§4a push),
`CommunityEntryNotifyWorker` + `CommunityEntryPushWorker` (in-app + web-push notification on new
entries, quiet-hours aware), `CommunityListingNotifyWorker` (email on listing interest),
`CommunityTranslationWorker` (§8), `CommunityScraperWorker` (on-demand single scraper run),
`Scheduler::EventImportScheduler`, `Scheduler::TranslationCatchupScheduler`,
`Scheduler::CommunityModerationReminderScheduler`, `Scheduler::CommunityStaleEntryScheduler`,
`Scheduler::ExpireListingsScheduler`, `Scheduler::MemberNotificationFlushScheduler` (flushes
quiet-hours-deferred notifications, every 15 min).

*Visits:* `CommunityVisitEmailWorker`, `CommunityVisitOverlapWorker` (detects overlapping visits
among connected accounts), `Scheduler::CommunityVisitDigestScheduler` (hourly).

*Site/member lifecycle:* `MemberWelcomeDigestWorker` (per-member "welcome back" AI digest, Claude
Haiku 4.5 — a **different** feature from Daily Digest, see §8), `NewMemberAnnouncementWorker` +
`WelcomeEmailWorker` (both fired 2h after signup), `PostNewsletterWorker` (auto-posts a published
newsletter as a status from the admin account).

**Scheduled jobs, exact UTC times** (`config/sidekiq.yml`, sidekiq-scheduler in-process — no
external cron or systemd timer):

| Time (UTC) | Job |
|---|---|
| 01:00 | `translation_catchup_scheduler` — finds entries missing any of the 12 locales, bulk-queues translation |
| 02:00 | `event_import_scheduler` — runs 4 scrapers (Centro Italia, Comune San Lorenzo, La Voce di Imperia, Riviera24), imports events |
| 03:00 | `expire_listings_scheduler` |
| 03:00–04:59 (random minute) | `vacuum_scheduler`, `ip_cleanup_scheduler`, `community_stale_entry_scheduler` (03:xx) |
| 04:00–05:59 (random minute) | `user_cleanup_scheduler` |
| 05:00 | `daily_digest_scheduler` (§8) |
| 07:00 (random minute) | `community_moderation_reminder_scheduler` |
| midnight | `pghero_scheduler` |

Plus interval-based (not cron): scheduled statuses (5m), accounts/suspended-user cleanup (15m),
notification flush (15m), auto-close registrations (1h), visit digest (1h), collection-item
cleanup (1h), remote-collection repair (24h).

---

## 8. AI features, translation, newsletters, email

### Daily Digest (`/daily`)

An AI-written bilingual (IT/EN) "community newspaper" generated once daily. **Model: Claude
Sonnet** (`claude-sonnet-4-6` default, `config/daily_digest.yml` / `ANTHROPIC_MODEL` env) via
the `anthropic` gem — not Haiku (that's Welcome Back Digest, a different feature, below).
`Scheduler::DailyDigestScheduler` (05:00 UTC) → `DailyDigestService#generate`
(`app/services/daily_digest_service.rb`) pulls up to 30 upcoming `CommunityEvent` rows plus the
latest newsletter teaser, and makes **two separate Claude calls** — Italian article, then a
second call to translate it — deliberately split after discovering a single combined `{it, en}`
JSON-schema call let the model conflate the two language fields under pure sampling variance.
Validates length + an IT/EN length-ratio guard (≥0.6) with up to 3 retries; stores one row per
day in `community_daily_digests` (unique on date). Never emailed — web-only,
`GET /api/v1/community_daily_digests` (public, no auth). The scheduler is in
`SIDEKIQ_ALERTABLE_WORKERS` (§7), so a fully-failed day pages the admin.

### Welcome Back Digest

A separate, per-member AI digest (Claude **Haiku 4.5**) shown to a member returning after
absence — `MemberWelcomeDigestWorker`, piggybacked on the sign-in throttle. Do not confuse with
Daily Digest above; different model, different trigger, different audience.

### Newsletters (`/newsletters`)

Admin uploads a PDF; `NewsletterImportService` sends it to Claude as a `document` content block
(genuine PDF understanding via the standard Messages API, not a separately-branded "Vision"
endpoint) in three calls: (1) extract structured bilingual content — title, both IT and EN
column text — directly into separate DB columns, no DeepL involved; (2) extract design tokens
(colors/fonts/layout) from the PDF's visuals, fails silently rather than blocking import; (3) if
`pdfimages` (poppler-utils) is installed, classify extracted images and drop
logos/branding-duplicates. Draft → admin review/edit → publish, which fires
`PostNewsletterWorker` to post an announcement status as the admin account (dedup-guarded against
re-posting). Original PDF kept at `public/newsletter_assets/:id/original.pdf`.

### Translation pipeline

`CommunityTranslationWorker` (queue `low`) translates every field a category's `config.json`
marks `translatable: true` into **12 locales**: `en it de fr es pt nl da sv no sl sq`. English is
included deliberately — it was excluded early on, then added back after discovering
non-English-speaking members' posts weren't getting an English version. SHA256 digest of the
source text dedupes against re-translating unchanged content. Provider: **DeepL** (primary,
`DeepL-Auth-Key` header) with LibreTranslate as fallback if no DeepL key is configured
(`CommunityTranslationService`). Nightly catch-up at 01:00 UTC scans 7 model types for entries
missing any locale (Newsletters are deliberately excluded — they get their bilingual text
directly from the PDF import, not this pipeline).

**Viewing locale vs. UI locale:** `hooks/useViewingLocale.js` is a separate concept from the
account's own UI language — stored in `localStorage` (`viewing_locale`), broadcast via a custom
window event so components stay in sync. Lets someone using another member's phone switch what
language content displays in without touching account settings.

### Email

SMTP settings come from `config/email.yml` → `action_mailer.smtp_settings` in
`config/environments/production.rb`, built from env vars (`SMTP_SERVER`, `SMTP_PORT=587`,
`SMTP_LOGIN`, `SMTP_PASSWORD`, ...) — actual values live only in the server's `.env.production`,
never on the Mac. A separate `bulk_mail.smtp_settings` block exists for bulk/subscription mail.
Notable mailers: `contact_message_mailer.rb` and `admin_alert_mailer.rb` (job deaths, unhandled
exceptions, nightly backup failure) both send to `CONTACT_NOTIFY_EMAIL`, falling back to the
first admin's email if unset. `admin_alert_mailer.rb` passes plain strings/arrays rather than a
raw exception object to `rails_exception`, because `deliver_later` can't serialize a raw
exception through ActiveJob — this silently broke every exception alert for weeks before being
caught. `welcome_mailer.rb` pulls its copy live from `SiteContent` at send time, so admins can
edit welcome-email text without a deploy.

---

## 9. Auth & identity

- **Password login/signup:** Devise (`two_factor_authenticatable`, `registerable`,
  `recoverable`), `app/controllers/auth/{registrations,sessions}_controller.rb`.
  **`registrations_mode: "none"` in `config/settings.yml` — this site is invite-only.**
  `RegistrationHelper#allowed_registration?` requires a valid, unused invite code; there is no
  open self-registration path.
- **API/app auth:** Doorkeeper (OAuth2), but the glitch web app does not do a client-side OAuth
  dance. On every authenticated page render, `render_initial_state`
  (`app/helpers/application_helper.rb`) embeds the current session's Doorkeeper access token
  into a `<script id="initial-state">` JSON blob. The frontend reads it via
  `initial_state.ts#getAccessToken()` and `api.ts` sets `Authorization: Bearer <token>` on every
  axios call. **The token lives only in that in-memory JS / the page's embedded JSON — not in a
  cookie or localStorage.** Devise's own session cookie is what re-authenticates on the next full
  page load, which re-embeds a token.
- **Frontend identity state** (`identity_context.tsx`) is populated from that same embedded JSON
  (`meta.me`, `role.permissions`), not a separate API round-trip.
- **Moderator vs Admin:** there is no separate "Moderator" role class — it's Mastodon's stock
  `UserRole` bitmask permission system. Barbara's Moderator scope (Quick Share posting, etc.) is
  granted via specific permission bits (`manage_reports` and/or `administrator`), checked as
  `current_user&.can?(:manage_reports)` at each gated action — see
  `community_quick_shares_controller.rb`'s `require_moderator!` for the pattern to copy if
  gating a new feature the same way.

---

## 10. Deployment

No CI/CD pipeline deploys this site — it's a manual `git pull` + restart on the Hetzner box, over
SSH, following the recipe in `docs/ADMIN_OPERATIONS.md`. The one rule that matters most, because
getting it wrong has broken the site twice: **`rm -rf tmp/cache/vite` only, never
`public/packs`** — see §5.

Restart matrix — what a change actually requires restarting:

| Changed | Restart |
|---|---|
| Ruby (controllers/models/workers) | `mastodon-web` (+ `mastodon-sidekiq` if a worker) |
| JS/React/SCSS | rebuild assets, then `mastodon-web` |
| `streaming/index.js` | `mastodon-streaming` — separate Node process, `mastodon-web` restart does **not** touch it |
| Caddyfile | `caddy validate` then `systemctl reload caddy` (no downtime) |
| DB migration | `db:migrate`, then `mastodon-web` + `mastodon-sidekiq` |

**Verifying a frontend deploy actually landed:** `curl -s https://miacivezza.com/sw.js | grep -c
<first-12-chars-of-the-deployed-git-sha>` should print `1` (see §5's build-stamping).

**Testing on the server without touching production data:** `RAILS_ENV=test` shares Paperclip's
file storage path with production **unless `PAPERCLIP_ROOT_PATH` is isolated** — check
`.env.test` sets it to something under `tmp/` before ever running RSpec on this box. A prior
session ran tests without checking this and it overwrote real member photos; recovered from the
nightly `/home/mastodon/backups/media_*.tar.gz` tarball.

---

## 11. Security posture

- **Rack-Attack** (`config/initializers/rack_attack.rb`) throttles by IP/token across several
  buckets (unauthenticated API, per-token API, media, sign-up, contact form, paging). Its
  `Request#params` reader is overridden to swallow `Rack::BadRequest` errors (malformed
  multipart uploads from vulnerability scanners used to crash it with a 500 before Rails ever
  saw the request — fixed 2026-09-21, see `spec/config/initializers/rack/attack_spec.rb`).
- **fail2ban** watches SSH; password auth is disabled entirely (key-only), SSH runs on a
  non-default port.
- **Constant background scanning is normal, not an incident.** Caddy's access log
  (`/var/log/caddy/access*.log*`, JSON, gzip-rotated) routinely shows a mix of IPs probing for
  `.env`/`.git`/WordPress/PHP-shell paths — roughly 5–10% of all traffic on a quiet day. Almost
  all get 404 because the software they're looking for (WordPress, PHP) doesn't exist here.
  Don't block individual scanner IPs — they rotate constantly and it accomplishes nothing; fix
  the underlying crash if one causes an actual 500 or alert email, as with the Rack-Attack issue
  above.
- **Alert emails are deduped** per exception class+message for 15 minutes
  (`config/initializers/error_reporting.rb`, `AdminExceptionNotifier`) — one email can represent
  dozens of identical events. If investigating an alert, check `journalctl -u mastodon-web` and
  the Caddy log around the timestamp for the real count, not just the one email.
- **The repo itself is public** (`strecca/mastodon` on GitHub — see §12); verified no API keys
  or secrets are tracked. All real secrets live only in the server's own `.env.production`.

---

## 12. Repo & accounts (a note on drift)

Production deploys from **`strecca/mastodon`** (the `origin` remote). A second fork,
`TruthTriumphs/glitch-soc-mastodon`, exists but is a stale 2021 fork with nothing pushed to it
since July 2026 — it is *not* production and nothing should be pushed there; an earlier version
of this project's own memory notes said otherwise and was wrong. If you see a GitHub email about
that fork (e.g. "workflow will be disabled"), it's routine and can be ignored.

---

## 13. Known open items (as of 2026-09-22)

- Profile/account timelines lack the wake-up refresh described in §4b.
- Signed-out visitors get no instant live push anywhere (§4a) — would need the streaming server
  to accept unauthenticated connections to `community:*` channels, a deliberate security
  trade-off David hasn't decided on yet.
- 10 pre-existing RSpec failures (tagged_objects, cache_spec DISALLOW_UNAUTHENTICATED_API_ACCESS,
  a CSP hash mismatch, an ngrok fixture, a heic codec test) — not investigated, not blocking.
- CSS Linting CI check has been red for a long time (~500 pre-existing stylelint errors); it only
  runs when SCSS changes, so it's visible but not gating.
- No pruning job for old `public/packs` builds — disk has plenty of headroom (a build is ~100MB,
  278GB free as of last check), but if one is ever needed, prune by "unreferenced in the current
  manifest AND older than ~14 days," never by file mtime alone (a skipped Vite build doesn't
  refresh mtimes, so mtime-based pruning would delete a chunk a live page still needs).

---

## 14. Standing rule for this document and this codebase

An issue found in one Community Directory category is assumed present in every category built on
the same pattern — they were generated from the same template and have since been kept in sync
deliberately. Audit and fix all of them in one pass rather than scoping a fix to only the
category that was reported.
