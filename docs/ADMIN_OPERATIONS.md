# miacivezza.com — Admin Operations Manual

A pilot's checklist for all server operations. Run steps in order. Never skip.

---

## 1. Connecting to the Server

Always open **two terminal tabs**:

```bash
# Tab 1 — root (for systemctl restarts)
ssh -i ~/.ssh/id_ed25519 root@178.104.56.201

# Tab 2 — mastodon user (for git, rails, assets)
ssh -i ~/.ssh/id_ed25519 mastodon@178.104.56.201
cd live
```

> If you need to push to GitHub FROM the server (rare — see §6):
> `ssh -A -i ~/.ssh/id_ed25519 mastodon@178.104.56.201`

---

## 2. Standard Deploy — Frontend Changes (JS / React / SCSS)

Run in **mastodon tab**:

```bash
git pull --rebase
rm -rf tmp/cache/vite public/packs
RAILS_ENV=production bundle exec rails assets:precompile
```

Run in **root tab**:

```bash
systemctl restart mastodon-web
```

> Use `rm -rf tmp/cache/vite public/packs` any time Vite says
> "Skipping vite build. Watched files have not changed."

---

## 3. Standard Deploy — Ruby-Only Changes (Controllers / Models / Workers)

Run in **mastodon tab**:

```bash
git pull --rebase
```

Run in **root tab**:

```bash
systemctl restart mastodon-web mastodon-sidekiq
```

---

## 4. Deploy with Database Migrations

Run in **mastodon tab**:

```bash
git pull --rebase
RAILS_ENV=production bundle exec rails db:migrate
RAILS_ENV=production bundle exec rails assets:precompile  # only if JS changed too
```

Run in **root tab**:

```bash
systemctl restart mastodon-web mastodon-sidekiq
```

---

## 5. Post-Deploy Warm-Up (always do this after restart)

Run in **mastodon tab**:

```bash
for cat in events artists properties services restaurants; do
  curl -s "https://miacivezza.com/api/v1/community_entries?category=$cat&per_page=20" > /dev/null
  echo "warmed: $cat"
done
```

This ensures the first real visitor gets a hot server, not a cold one.

---

## 6. Adding New UI Translation Strings

Only needed when new hardcoded text is added to community pages.

### Step A — On Mac: add string to en.json, commit, push

```bash
# edit app/javascript/flavours/glitch/locales/en.json
# add your new key, e.g.:
#   "community.my_feature.label": "My Label"
git add app/javascript/flavours/glitch/locales/en.json
git commit -m "i18n: add community.my_feature.label"
git push
```

### Step B — On server (mastodon tab): pull and run rake task

```bash
git pull --rebase
RAILS_ENV=production bundle exec rails i18n:translate_community
# add PREFIX=community.my_feature. to only translate new keys
```

### Step C — On Mac: scp locale files down, commit, push

```bash
scp 'mastodon@178.104.56.201:/home/mastodon/live/app/javascript/flavours/glitch/locales/*.json' \
  /Users/davidh/Projects/glitch-dev/mastodon/app/javascript/flavours/glitch/locales/

git add app/javascript/flavours/glitch/locales/*.json
git commit -m "i18n: translate new keys via DeepL"
git push
```

### Step D — On server: discard local locale changes, pull

```bash
git checkout -- app/javascript/flavours/glitch/locales/
git pull
rm -rf tmp/cache/vite public/packs
RAILS_ENV=production bundle exec rails assets:precompile
```

Root tab:

```bash
systemctl restart mastodon-web
```

---

## 7. Caddy Web Server

```bash
# Edit config (as root)
nano /etc/caddy/Caddyfile

# Validate before reloading
caddy validate --config /etc/caddy/Caddyfile

# Reload (no downtime)
systemctl reload caddy
```

Canonical copy of Caddyfile is in the repo at `dist/Caddyfile`.

---

## 8. Sidekiq / Background Jobs

```bash
# View live job queue (root tab)
journalctl -u mastodon-sidekiq -f

# Restart Sidekiq only
systemctl restart mastodon-sidekiq

# Sidekiq web dashboard (admin only)
# https://miacivezza.com/sidekiq
```

---

## 9. Monitoring Logs

```bash
journalctl -u mastodon-web -f        # Rails app logs
journalctl -u mastodon-sidekiq -f    # Background job logs
journalctl -u mastodon-streaming -f  # WebSocket streaming logs
journalctl -u caddy -f               # Web server / TLS logs
```

Ctrl+C stops watching — does NOT stop the service.

---

## 10. If git pull --rebase Fails

### "You have unstaged changes"

```bash
git checkout -- .yarn/install-state.gz
git pull --rebase
```

If locale files are also modified (after rake task ran):

```bash
git checkout -- app/javascript/flavours/glitch/locales/
git pull --rebase
```

### "Merge conflict" during rebase

If the conflict is in locale files (already pushed from Mac):

```bash
git rebase --skip
```

### "Divergent branches"

Always use `--rebase` flag:

```bash
git pull --rebase
```

---

## 11. Key Server Facts

| Thing | Value |
|---|---|
| Server IP | 178.104.56.201 |
| App directory | `/home/mastodon/live` |
| Caddyfile | `/etc/caddy/Caddyfile` |
| Assets output | `/home/mastodon/live/public/packs` |
| Redis/Valkey | `localhost:6379` |
| Rails port | `3000` |
| Streaming port | `4000` |
| Admin login | `admin@localhost` / see password doc |
| Sidekiq dashboard | `https://miacivezza.com/sidekiq` |
| Translation status | `https://miacivezza.com/admin/translation_status` |

---

## 12. Services Quick Reference

```bash
# Restart everything after a big deploy
systemctl restart mastodon-web mastodon-sidekiq mastodon-streaming

# Check all service status
systemctl status mastodon-web mastodon-sidekiq mastodon-streaming caddy
```
