#!/bin/bash
#
# install_community_directory.sh
#
# Automates wiring changes for the Community Directory system.
# Run from your Mastodon repo root AFTER copying app/ files into place.
#
# Usage:
#   chmod +x install_community_directory.sh
#   ./install_community_directory.sh
#
# Safe to run multiple times — all patches are idempotent.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1"; exit 1; }

# Verify we're in the right directory
[[ -f "config/routes.rb" ]] || err "Run this from your Mastodon repo root."

echo ""
echo "═══════════════════════════════════════════════"
echo "  Community Directory — Wiring Installation"
echo "═══════════════════════════════════════════════"
echo ""

# ─── 1. async-components.js ──────────────────────────────────

AC="app/javascript/flavours/glitch/features/ui/util/async-components.js"

if grep -q "CommunityHub" "$AC"; then
  warn "async-components.js already patched — skipping."
else
  cat >> "$AC" <<'EOF'

export function CommunityHub () {
  return import('../../community_hub');
}

export function CommunityDirectory () {
  return import('../../community_directory');
}

export function CommunityDirectoryFormBuilder () {
  return import('../../community_directory/admin');
}
EOF
  info "async-components.js — appended 3 lazy loaders."
fi

# ─── 2. ui/index.jsx — imports ───────────────────────────────

UI="app/javascript/flavours/glitch/features/ui/index.jsx"

if grep -q "CommunityHub," "$UI"; then
  warn "ui/index.jsx imports already patched — skipping."
else
  # Insert the three names before the closing of the async-components import
  # Using sed on macOS (BSD sed requires '' after -i)
  sed -i '' "/} from '.\/util\/async-components';/i\\
  CommunityHub,\\
  CommunityDirectory,\\
  CommunityDirectoryFormBuilder,
" "$UI"
  info "ui/index.jsx — added import names."
fi

# ─── 3. ui/index.jsx — routes ───────────────────────────────

if grep -q "community_directory" "$UI"; then
  warn "ui/index.jsx routes already patched — skipping."
else
  # Insert community routes before the explore route
  sed -i '' "/<WrappedRoute path='\/explore'/i\\
            {/* Community Directory */}\\
            <WrappedRoute path='/community' exact component={CommunityHub} content={children} />\\
            <WrappedRoute path='/community_directory/admin' component={CommunityDirectoryFormBuilder} content={children} />\\
            <WrappedRoute path='/community_directory' exact component={CommunityDirectory} content={children} />\\

" "$UI"
  info "ui/index.jsx — added 3 WrappedRoute entries."
fi

# ─── 4. reducers/index.ts ────────────────────────────────────

RI="app/javascript/flavours/glitch/reducers/index.ts"

if grep -q "community_directory" "$RI"; then
  warn "reducers/index.ts already patched — skipping."
else
  # Add imports after the last existing import line
  sed -i '' "/import trends from '.\/trends';/a\\
import community_directory from './community_directory';\\
import community_entries from './community_entries';
" "$RI"

  # Add to reducers object after the first line of the object
  sed -i '' "/const reducers = {/a\\
  community_directory,\\
  community_entries,
" "$RI"

  info "reducers/index.ts — registered both reducers."
fi

# ─── 5. config/routes/api.rb ─────────────────────────────────

API_ROUTES="config/routes/api.rb"

if grep -q "community_directory" "$API_ROUTES"; then
  warn "API routes already patched — skipping."
else
  sed -i '' "/namespace :v1 do/a\\
    # Community Directory\\
    get 'community_directory/categories', to: 'community_directory#categories'\\
    post 'community_directory/generate', to: 'community_directory#generate'\\
    resources :community_directory_public, only: [:index]
" "$API_ROUTES"
  info "config/routes/api.rb — added admin + public API routes."
fi

# ─── 6. config/routes/web_app.rb ─────────────────────────────

WEB_ROUTES="config/routes/web_app.rb"

if grep -q "community" "$WEB_ROUTES"; then
  warn "web_app.rb SPA routes already patched — skipping."
else
  sed -i '' "/^).each/i\\
  /community\\
  /community_directory\\
  /community_directory/(*any)
" "$WEB_ROUTES"
  info "config/routes/web_app.rb — added SPA catch-all routes."
fi

# ─── 7. application.scss ─────────────────────────────────────

SCSS="app/javascript/flavours/glitch/styles/application.scss"

if grep -q "community_directory" "$SCSS"; then
  warn "application.scss already patched — skipping."
else
  echo "" >> "$SCSS"
  echo "@use 'mastodon/community_directory';" >> "$SCSS"
  info "application.scss — imported community_directory styles."
fi

# ─── 8. Verify kaminari ──────────────────────────────────────

if grep -q "kaminari" Gemfile; then
  info "kaminari gem found in Gemfile."
else
  warn "kaminari gem not found. Generated controllers need it for pagination."
  echo "    Run: echo \"gem 'kaminari'\" >> Gemfile && bundle install"
fi

# ─── Done ─────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════"
echo "  All patches applied."
echo ""
echo "  Next steps:"
echo "    1. rm -rf public/packs-dev tmp/cache"
echo "    2. bin/dev"
echo "    3. Navigate to /community_directory (admin)"
echo "    4. Create your first category!"
echo "═══════════════════════════════════════════════"
echo ""
