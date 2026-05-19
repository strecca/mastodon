# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**Mastodon Glitch Edition** — a fork of [Mastodon](https://github.com/mastodon/mastodon) maintained at glitch-soc. It adds extra features and local customizations, including a **Community Directory** scaffolding system (see `docs/CLAUDE.md` for its full architecture).

Tech stack: Ruby on Rails (REST API, admin) · PostgreSQL · Redis/Sidekiq · Node.js streaming server · React 18 + Redux (Immutable.js) · Vite build.

## Development Commands

### Start all services
```bash
bin/dev       # launches Rails (3000), Sidekiq, streaming (4000), Vite via foreman/overmind
```

### Reset after generating new files or fixing Vite issues
```bash
rm -rf public/packs-dev tmp/cache && bin/dev
```
Vite HMR does not reliably pick up new files written to disk — always do a full restart.

### Ruby / Rails
```bash
bundle exec rails db:migrate          # run pending migrations
bundle exec rails db:rollback         # undo last migration
bundle exec rails dev:populate_sample_data  # seed sample data
bundle exec rails routes              # list all routes
```

### JavaScript
```bash
yarn lint          # ESLint + Stylelint
yarn lint:js       # ESLint only
yarn lint:css      # Stylelint only
yarn fix           # auto-fix ESLint + Stylelint issues
yarn typecheck     # TypeScript tsc --noEmit
yarn test:js run   # run Vitest (legacy-tests project)
yarn i18n:extract  # extract i18n strings to en.json
```

### Running a single Ruby test
```bash
bundle exec rspec spec/path/to/spec_file.rb
bundle exec rspec spec/path/to/spec_file.rb:LINE_NUMBER
```

### Running a single JS test
```bash
yarn test:js run path/to/test.spec.ts
```

## Architecture

### Backend (Rails)
```
app/
  controllers/    # REST API + web controllers
  models/         # ActiveRecord models
  services/       # business logic (e.g., community_directory_generator.rb)
  workers/        # Sidekiq async jobs
  policies/       # Pundit authorization
  serializers/    # active_model_serializers JSON output
  mailers/
config/routes/    # split into admin.rb, api.rb, fasp.rb, settings.rb, web_app.rb
```

### Frontend (React + Redux)
All JavaScript lives under `app/javascript/`. There are two flavors: `glitch` (this fork) and `vanilla` (upstream). Always work in `glitch`.

```
app/javascript/flavours/glitch/
  main.tsx            # entry point
  actions/            # Redux action creators
  reducers/           # Redux reducers (index.ts registers all)
  components/         # shared/reusable React components
  features/           # page-level feature components (one folder per route/view)
  features/ui/        # top-level layout, routing shell
  features/ui/util/async-components.js  # lazy-load registry — add new routes here
  features/ui/index.jsx                 # <WrappedRoute> declarations
  store/              # Redux store setup (useAppSelector, useAppDispatch)
  api.ts              # axios instance with auth headers
  identity_context.tsx  # withIdentity HOC, signedIn/accountId
  entrypoints/        # Vite entrypoints
  styles/             # SCSS (application.scss is the root import)
```

### Streaming server
`streaming/` — standalone Node.js process (port 4000). Manages WebSocket connections for real-time timeline updates.

### Vite build
- Dev output: `public/packs-dev/`
- Production output: `public/packs/`
- Config: `vite.config.mts`, path aliases: `~/` and `@/` both resolve to `app/javascript/`

## Routing Pattern (Three-Layer Lazy-Loading)

To add a new page:
1. **`async-components.js`** — add a named export: `export const MyPage = () => import('../my_page');`
2. **`ui/index.jsx`** — add `import { MyPage } from '../util/async-components'` and a `<WrappedRoute path='/my-path' component={MyPage} />`
3. **`config/routes/web_app.rb`** — add `get '/my-path/(*any)', ...` catch-all for the SPA

More specific routes must come before less specific ones in `ui/index.jsx`.

## State Management Patterns

- Root Redux state is an ImmutableRecord — both `state.foo` and `state.get('foo')` work.
- Sub-state trees use Immutable.js: use `.get()`, `.getIn()`, `.size` for Lists.
- Always import hooks from the store: `import { useAppSelector, useAppDispatch } from 'flavours/glitch/store';`
- Generated page components receive `params` (from react-router `match.params`, NOT hooks) and `multiColumn` from `<Bundle>`.

## Key Import Paths
```jsx
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { Avatar } from 'flavours/glitch/components/avatar';
import { withIdentity } from 'flavours/glitch/identity_context';
import api from 'flavours/glitch/api';
import { Helmet } from '@unhead/react/helmet';
```

SVG icons: `import FooIcon from '@/material-icons/400-24px/foo.svg?react';`

## Community Directory Feature

This repository includes a custom **Community Directory** — a build-time scaffolding system that generates new community resource categories (artists, events, etc.) from an admin UI at `/community_directory/admin`. It writes real Rails and React files to disk and injects routes.

**Full architecture documentation: `docs/CLAUDE.md`**

Key points:
- Generated pages are thin wrappers around shared components in `app/javascript/flavours/glitch/components/community_directory/`
- A single Redux reducer (`reducers/community_entries.js`) handles all categories via `categoryKey`
- After generating a category, always run: `rm -rf public/packs-dev tmp/cache && bin/dev`
- The `community_directory_v2/` directory contains a standalone installable copy of the feature with its own `install_community_directory.sh` script

## Default Dev Credentials

- Admin login: `admin@localhost` / `mastodonadmin`
- Rails server: http://localhost:3000
- Streaming: http://localhost:4000
