# Community Directory — Installation Guide

## Overview

This installs the Community Directory scaffolding system into your glitch-soc Mastodon fork.
The system has three layers:

1. **Public Hub** (`/community`) — Card grid showing all generated categories. Anyone can see it.
2. **Shared Components** — Smart React components that power every generated feature.
3. **Admin Scaffolding Tool** (`/community_directory`) — Form builder where admins design categories.
   Clicking "Generate" physically writes all files for a new community feature.

community_directory is not a user-facing directory browser. It is a code generator / scaffolding engine that only the admin sees. When the admin types "artists" into the admin UI at /community_directory/admin/, the system does not just insert a row into a database — it generates an entirely new feature at features/community_artists/ with its own folder structure, its own pages (index, show, new, edit), its own async-components entry, its own routes in ui/index.jsx, and its own PostgreSQL table (community_artists). The admin types "events" → out comes features/community_events/ as a fully independent, first-class glitch-soc feature that regular logged-in users can interact with.
So community_directory is the factory. The features it produces (community_artists, community_events, etc.) are the products. The factory is never public. The products are.
The routing constraint: /community_directory/admin/ is correct, /admin/community_directory would collide with Mastodon's existing admin namespace.

This means the admin UI needs a backend endpoint (Rails controller) that receives the category name + form configuration, and uses Ruby file-writing (File.write, FileUtils.mkdir_p) to scaffold everything. The React admin page calls that API, and the server-side does the actual file generation.

he system has three layers:
Layer 1 — Shared components (written once, used by ALL generated features): A set of smart React components at components/community_directory/ that know how to render a list page, detail page, form page, search/filters, and cards — all driven by a config.json that defines the fields, layout, groups, and filters. One generic Redux actions module + one reducer handles all categories dynamically (keyed by category name). No per-category Redux files needed.
Layer 2 — The admin scaffolding tool (features/community_directory/): The form builder UI where you design fields, set types/labels/options, mark searchable, choose column layout, group fields. When you click "Generate," it sends the config to a Rails service.
Layer 3 — The Rails generator (app/services/community_directory_generator.rb): Receives the config and physically writes to your Mac's filesystem: the feature folder with thin wrapper pages that import the shared components + config.json, the database migration, the Rails model, the Rails API controller, and injects the new routes into async-components.js, ui/index.jsx, and config/routes.rb.
The generated feature files are intentionally thin — each is 15-20 lines that import a shared component and pass the config. The intelligence lives in the shared components, so bug fixes or improvements propagate to all categories automatically.
This is a significant build. I'm going to create the files now — starting with the Rails generator (the heart), then shared components, then the admin form builder UI.

Already created (14 files): Generator, admin controller, actions (2), reducer (1), shared components (5), admin UI (3 + field_editor + form_preview)
Still needed:

Admin reducer (reducers/community_directory.js)
Public landing page (the scrolling cards grid showing all categories)
SCSS styles for every community-* and cd-* class
Generator fix: routes are in config/routes/api.rb not config/routes.rb, and it also needs to inject web_app.rb for SPA routing
Wiring patch file with exact lines to add to async-components.js, ui/index.jsx, reducers/index.ts, config/routes/api.rb, config/routes/web_app.rb

Here's the complete package — 20 files covering every layer of the system.
What's in the archive:
Rails backend (3 files):

community_directory_generator.rb — the scaffolding engine that writes files when admin generates a category. Fixed to target config/routes/api.rb (not routes.rb) and also injects SPA routes into web_app.rb
community_directory_controller.rb — admin-only API (list categories, trigger generation)
community_directory_public_controller.rb — public API (list all categories for the hub page, no auth)

Generic Redux layer (2 files):

actions/community_entries.js — factory pattern: one module handles CRUD for ALL categories via categoryKey parameter
reducers/community_entries.js — single reducer stores state for every category, keyed by name

Admin Redux (2 files):

actions/community_directory.js — fetchCategories + generateCategory
reducers/community_directory.js — admin-specific state

Shared React components (5 files) — the brains used by every generated feature:

entry_list.jsx, entry_card.jsx, search_filters.jsx, entry_detail.jsx, entry_form.jsx

Admin UI (3 files):

features/community_directory/index.jsx — admin landing (list existing categories)
admin/index.jsx — the form builder
admin/components/field_editor.jsx + form_preview.jsx

Public hub (1 file):

features/community_hub/index.jsx — the scrolling card grid at /community

Styles (1 file):

community_directory.scss — styles for every component, using glitch-soc's actual CSS custom properties

Installation (2 files):

INSTALL.md — step-by-step manual guide
install_community_directory.sh — automated Mac-compatible script that patches all 5 wiring files (async-components, ui/index, reducers/index, api.rb, web_app.rb, application.scss). Idempotent — safe to run multiple times.

Every time you click "Generate" in the admin form builder, the CommunityDirectoryGenerator service does all of this in one shot:
Files it CREATES (new, per category):
CreatedExample for "artists"Feature folder with 4 thin React pagesfeatures/community_artists/index.jsx, show/index.jsx, new/index.jsx, edit/index.jsxConfig JSONfeatures/community_artists/config.jsonRails modelapp/models/community_artist.rbRails controllerapp/controllers/api/v1/community_artists_controller.rbDatabase migrationdb/migrate/..._create_community_artists.rb
Files it AUTO-UPDATES (existing, injected into):
ModifiedWhat gets injectedasync-components.js4 new lazy-load exports (CommunityArtists, CommunityArtistsShow, CommunityArtistsNew, CommunityArtistsEdit)ui/index.jsxImport names + 4 <WrappedRoute> entries for /community_artists, /community_artists/:id, etc.config/routes/api.rbresources :community_artists, only: [:index, :show, :create, :update, :destroy]config/routes/web_app.rb/community_artists/(*any) so Rails serves the SPA for direct URL navigationDatabaseRuns bin/rails db:migrate automatically in development
Files that DON'T need updating per category (by design):

reducers/index.ts — registered once during install. The single community_entries reducer handles ALL categories dynamically by keying state on categoryKey. When "artists" actions fire, they use the prefix COMMUNITY_ENTRIES/artists/FETCH_SUCCESS and the reducer routes them to the right bucket automatically.
The public hub at /community — it queries the API at runtime, reads all community_* tables from the database, and renders cards for each one. New categories appear automatically with no file changes.

The one manual step after each generation: you need to restart Vite so it picks up the new React files:
bashrm -rf public/packs-dev tmp/cache && bin/dev
The generator's success response reminds you of this. After restart, the new category is fully live — browsable at /community_artists, searchable, with forms for logged-in users, and the card automatically appears on the /community hub page.

## Step 1: Copy Files

From your Mastodon repo root:

```bash
# Extract the archive
tar xzf community_directory_v2.tar.gz

# Copy everything into place
cp -R community_directory_v2/app/ app/
```

This places:

| File | Purpose |
|------|---------|
| `app/services/community_directory_generator.rb` | Rails scaffolding engine |
| `app/controllers/api/v1/community_directory_controller.rb` | Admin API (generate, list categories) |
| `app/controllers/api/v1/community_directory_public_controller.rb` | Public API (browse categories) |
| `app/javascript/flavours/glitch/actions/community_directory.js` | Admin Redux actions |
| `app/javascript/flavours/glitch/actions/community_entries.js` | Generic CRUD actions for all categories |
| `app/javascript/flavours/glitch/reducers/community_directory.js` | Admin state reducer |
| `app/javascript/flavours/glitch/reducers/community_entries.js` | Generic entries reducer (all categories) |
| `app/javascript/flavours/glitch/components/community_directory/` | 5 shared components |
| `app/javascript/flavours/glitch/features/community_directory/` | Admin UI (3 files) |
| `app/javascript/flavours/glitch/features/community_hub/index.jsx` | Public landing page |
| `app/javascript/flavours/glitch/styles/mastodon/community_directory.scss` | All styles |

## Step 2: Wire async-components.js

**File:** `app/javascript/flavours/glitch/features/ui/util/async-components.js`

Add these exports at the **end** of the file:

```js
export function CommunityHub () {
  return import('../../community_hub');
}

export function CommunityDirectory () {
  return import('../../community_directory');
}

export function CommunityDirectoryFormBuilder () {
  return import('../../community_directory/admin');
}
```

## Step 3: Wire ui/index.jsx routes

**File:** `app/javascript/flavours/glitch/features/ui/index.jsx`

### 3a. Add to the import block

Find the closing of the async-components import (the line `} from './util/async-components';`)
and add these three names **inside** the import, before the closing `}`:

```js
  CommunityHub,
  CommunityDirectory,
  CommunityDirectoryFormBuilder,
```

### 3b. Add WrappedRoute entries

Find this line:
```jsx
<WrappedRoute path='/explore' component={Explore} content={children} />
```

Add these **before** it:

```jsx
            {/* Community Directory */}
            <WrappedRoute path='/community' exact component={CommunityHub} content={children} />
            <WrappedRoute path='/community_directory/admin' component={CommunityDirectoryFormBuilder} content={children} />
            <WrappedRoute path='/community_directory' exact component={CommunityDirectory} content={children} />
```

## Step 4: Register reducers

**File:** `app/javascript/flavours/glitch/reducers/index.ts`

### 4a. Add imports

After the existing import lines, add:

```ts
import community_directory from './community_directory';
import community_entries from './community_entries';
```

### 4b. Add to the reducers object

Inside the `const reducers = {` block, add:

```ts
  community_directory,
  community_entries,
```

## Step 5: Add API routes

**File:** `config/routes/api.rb`

Find `namespace :v1 do` and add inside it:

```ruby
    # Community Directory admin API
    get 'community_directory/categories', to: 'community_directory#categories'
    post 'community_directory/generate', to: 'community_directory#generate'

    # Community Directory public API
    resources :community_directory_public, only: [:index]
```

## Step 6: Add SPA routes

**File:** `config/routes/web_app.rb`

Add these lines inside the `%w(` array, before the closing `).each`:

```
  /community
  /community_directory
  /community_directory/(*any)
```

## Step 7: Add stylesheet import

**File:** `app/javascript/flavours/glitch/styles/application.scss`

Add this line at the end:

```scss
@use 'mastodon/community_directory';
```

## Step 8: Add kaminari gem (if not present)

The generated controllers use `.page().per()` pagination from the kaminari gem.
Check if it's in your Gemfile:

```bash
grep kaminari Gemfile
```

If it's there, skip this step. If not:

```bash
echo "gem 'kaminari'" >> Gemfile
bundle install
```

## Step 9: Clear cache and restart

```bash
rm -rf public/packs-dev tmp/cache
bin/dev
```

## Usage

1. Navigate to `/community_directory` (admin only).
2. Click "Create new category."
3. Design the form: add fields, set types, mark required/searchable, organize into groups.
4. Click "Generate community feature."
5. After generation completes, run: `rm -rf public/packs-dev tmp/cache && bin/dev`
6. The new feature appears at `/community_CATEGORYNAME`
7. The public hub at `/community` automatically lists all generated categories.

## How Generated Features Work

When you generate "artists", the system writes:

| Generated file | Purpose |
|---------------|---------|
| `features/community_artists/config.json` | Field definitions, layout, groups |
| `features/community_artists/index.jsx` | List page (imports shared EntryList) |
| `features/community_artists/show/index.jsx` | Detail page (imports shared EntryDetail) |
| `features/community_artists/new/index.jsx` | Create form (imports shared EntryForm) |
| `features/community_artists/edit/index.jsx` | Edit form (imports shared EntryForm) |
| `app/models/community_artist.rb` | Rails model with validations + search scope |
| `app/controllers/api/v1/community_artists_controller.rb` | CRUD API controller |
| `db/migrate/..._create_community_artists.rb` | Database migration |

Plus it auto-injects into:
- `async-components.js` — lazy-load entries
- `ui/index.jsx` — React routes
- `config/routes/api.rb` — API routes
- `config/routes/web_app.rb` — SPA routes

The generated page files are thin wrappers (~15 lines each). All logic lives in
the shared components at `components/community_directory/`, so bug fixes and
improvements propagate to every category automatically.

## Permissions

- **Public** (not logged in): Can browse all categories, search, view all entries.
- **Logged-in user**: Can browse + add new entries + edit entries they own.
- **Admin**: Can access `/community_directory` to generate new categories.
