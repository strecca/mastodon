# Admin Translation Guide
## miacivezza.com — Translation Status Dashboard & Command Reference

---

## The Translation Status Dashboard

Access: **Admin → Site Content & Translations → Translation Status tab**
URL: `https://miacivezza.com/admin/translation_status`

---

### Summary Tiles (top row)

| Tile | What it means |
|------|--------------|
| **Total translation rows stored** | Each row = one translatable field, for one entry, in one language. A Community Event with 2 fields (title + description) translated into 11 languages = 22 rows. Low numbers are normal when the site is new. |
| **Sidekiq jobs processed (all time)** | Every background job ever completed — translations, scraper runs, media processing, emails, federation. Not translation-specific. 28,000+ is healthy for a running instance. |
| **Jobs currently in queue** | Pending background jobs waiting to run. A few is normal. Hundreds means something is backed up. |
| **Failed jobs** (red tile, only appears when > 0) | Jobs that crashed and were not retried successfully. **314 failed jobs is worth investigating** — click "→ view in Sidekiq" to see the error details and retry or discard them. |

---

### Target Languages Row

The coloured badges (IT, DE, FR, ES, PT, NL, DA, SV, NO, SL, SQ) show every language the DeepL auto-translation system targets. When you add a new locale to `CommunityTranslationWorker::TARGET_LOCALES`, it appears here automatically.

---

### The Category Table

| Column | What it means |
|--------|--------------|
| **Category** | One of the 7 translatable content types. Grey/dimmed rows have no entries yet. |
| **Entries** | How many records exist in the database for that category. |
| **Translation rows** | Rows in the `community_entry_translations` table for this category. Healthy target: Entries × fields-per-entry × 11 locales. |
| **Coverage bar + %** | Percentage of the 11 target locales that have *at least one* translation row for this category. 100% means every language is represented — it does not guarantee every individual entry is translated. |
| **Locales present** | Green badge = at least one translation exists for that locale. Grey badge = no translation yet. |
| **Action** | Backfill button queues every entry in that category to Sidekiq for DeepL translation. Only appears when Entries > 0. |

#### Reading the current numbers (as of July 2026)

| Category | Status | Meaning |
|----------|--------|---------|
| Community Events | 33 entries / 66 rows / 100% | All 11 locales have translations. 66 rows = 33 events × 2 fields (title + description). |
| Community Artists | 1 entry / 9 rows / 81% | 9 of 11 locales translated. Click Backfill to catch up the missing 2. |
| Community Services | 1 entry / 0 rows | Entry exists but has never been translated. Click Backfill. |
| Community Listings | 6 entries / 0 rows | Same — 6 listings untranslated. Click Backfill. |
| Member Stories | 1 entry / 0 rows | Same — 1 story untranslated. Click Backfill. |
| Community Restaurants / Properties | 0 entries | No content yet — no action needed. |

---

### How Long Translations Last

**Translations are permanent.** They live in the `community_entry_translations` database table and are never automatically deleted or expired.

- When an Admin or user **saves/updates** an entry, the system immediately queues a DeepL job for that entry only.
- The worker computes a SHA256 digest of the field text. If the text hasn't changed since last translation, the job is skipped — no redundant API calls.
- Translations are deleted only if the parent entry is deleted.
- **User posts** (Mastodon statuses) are translated on-demand via the "Translate" button — DeepL processes them in real time, not via this queue.

---

### The Backfill Button

Use Backfill when:
- A category has entries but 0 translation rows (new feature, or translations were never triggered)
- You add a new target locale and need to back-populate all existing entries
- Failed jobs left gaps in coverage

Each press queues every entry in that category. DeepL processes them within seconds to minutes depending on queue depth. Refresh the page after a minute to see the counts update.

---

### The 314 Failed Jobs

This is the most important thing to act on. Visit `/sidekiq/retries` (linked from the red tile) to:
1. See which worker + error caused each failure
2. Retry all — if the errors were transient (network timeout, DeepL API rate limit), they'll succeed on retry
3. Discard all — if they're old and no longer relevant

Common translation failure causes: DeepL API key expired, rate limit hit, entry was deleted before job ran.

---

---

## Command Reference

### Which terminal runs what

**Mac terminal (git and yarn only — no Rails, no bundle, no bin/dev)**
**Hetzner terminal (all Rails, Ruby, systemctl commands)**

---

### Mac Terminal Commands

```bash
# Push code to GitHub after committing
git push origin main

# Check what's changed
git status
git diff

# Lint and type-check JavaScript before pushing
yarn lint
yarn fix          # auto-fix lint errors
yarn typecheck
```

---

### Hetzner Terminal — logged in as mastodon user in ~/live

#### Standard deploy (after git push from Mac)

```bash
# 1. Pull latest code
git pull

# 2. Run any new database migrations (only when migration files were added)
RAILS_ENV=production bundle exec rails db:migrate

# 3. Seed new site content keys (only when SiteContent::SEED_EN was updated)
RAILS_ENV=production bundle exec rails runner 'SiteContent.seed!'

# 4. Rebuild frontend assets (only when JS/SCSS/JSX files changed)
RAILS_ENV=production NODE_ENV=production npx vite build

# 5. Restart web server (always — picks up Ruby/controller/view changes)
sudo systemctl restart mastodon-web

# 6. Restart background jobs (only when worker files changed)
sudo systemctl restart mastodon-sidekiq

# 7. Restart streaming server (only when streaming/index.js changed)
sudo systemctl restart mastodon-streaming
```

#### Rails console and runners

```bash
# Open interactive Rails console
RAILS_ENV=production bundle exec rails console

# Run a one-liner without opening the console
RAILS_ENV=production bundle exec rails runner 'puts SiteContent.count'

# Check routes
RAILS_ENV=production bundle exec rails routes | grep translation

# Run a specific migration
RAILS_ENV=production bundle exec rails db:migrate VERSION=20260601000000

# Roll back last migration
RAILS_ENV=production bundle exec rails db:rollback
```

#### Translation-specific runners

```bash
# Count translation rows by category
RAILS_ENV=production bundle exec rails runner \
  'puts CommunityEntryTranslation.group(:translatable_type).count'

# Manually queue one entry for translation
RAILS_ENV=production bundle exec rails runner \
  'CommunityTranslationWorker.perform_async("CommunityEvent", 1)'

# Queue all events for translation (same as Backfill button)
RAILS_ENV=production bundle exec rails runner \
  'CommunityEvent.find_each { |e| CommunityTranslationWorker.perform_async("CommunityEvent", e.id) }'

# Check Sidekiq queue depth
RAILS_ENV=production bundle exec rails runner \
  'require "sidekiq/api"; s = Sidekiq::Stats.new; puts "Processed: #{s.processed}, Enqueued: #{s.enqueued}, Failed: #{s.failed}"'
```

---

### Hetzner Terminal — run as root (or with sudo)

#### Log viewing

```bash
# Web server logs (last 50 lines)
sudo journalctl -u mastodon-web -n 50 --no-pager

# Filter for errors only
sudo journalctl -u mastodon-web -n 100 --no-pager | grep -i "error\|500\|Error"

# Filter for a specific controller or path
sudo journalctl -u mastodon-web -n 100 --no-pager | grep "translation_status"

# Sidekiq worker logs
sudo journalctl -u mastodon-sidekiq -n 50 --no-pager

# Follow logs in real time (Ctrl+C to stop)
sudo journalctl -u mastodon-web -f

# Show logs from the last 10 minutes
sudo journalctl -u mastodon-web --since "10 minutes ago" --no-pager
```

#### Service management

```bash
# Check which mastodon services are running
systemctl list-units | grep mastodon

# Check status of one service
sudo systemctl status mastodon-web

# Restart all mastodon services at once
sudo systemctl restart mastodon-web mastodon-sidekiq mastodon-streaming
```

---

### Troubleshooting Cheat Sheet

| Symptom | Check | Fix |
|---------|-------|-----|
| 500 error on any admin page | `sudo journalctl -u mastodon-web -n 30 --no-pager \| grep -i error` | Read the Ruby exception; fix the file; git push; git pull; restart mastodon-web |
| Frontend change not showing | Is it a JS/SCSS file? | Run `npx vite build` on Hetzner, then hard-refresh (Cmd+Shift+R) |
| New Rails route not found | Did you restart? | `sudo systemctl restart mastodon-web` |
| Translation rows not increasing | Check Sidekiq for failed jobs | Visit `/sidekiq/retries`; fix root cause; retry or requeue via Backfill button |
| Site content text not updating | Did you seed? | `RAILS_ENV=production bundle exec rails runner 'SiteContent.seed!'` |
| DB migration error | Wrong RAILS_ENV syntax | Always prefix: `RAILS_ENV=production bundle exec rails db:migrate` — never suffix |
| git pull says "Already up to date" on Hetzner | Forgot to push from Mac first | Run `git push origin main` on Mac, then pull again on Hetzner |

---

### Dashboard URLs (bookmarkable)

| Page | URL |
|------|-----|
| Site Content & Translations | `https://miacivezza.com/admin/site_settings/edit` |
| Translation Status | `https://miacivezza.com/admin/translation_status` |
| Sidekiq Dashboard | `https://miacivezza.com/sidekiq` |
| Sidekiq Failed Jobs | `https://miacivezza.com/sidekiq/retries` |
| Admin Dashboard | `https://miacivezza.com/admin/dashboard` |
