# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**miacivezza.com**: a closed community site for Civezza built on **Mastodon glitch-soc** (a fork of
[Mastodon](https://github.com/mastodon/mastodon)), with custom community features (events, listings,
artists, restaurants, services, properties, visits, member stories, newsletters, Daily Digest) and a
**Community Directory** scaffolding system. It runs in production on one Hetzner server.

Tech stack: Ruby on Rails (REST API, admin) · PostgreSQL · Redis (Valkey) / Sidekiq · Node.js streaming
server · React 18 + Redux (Immutable.js) · Vite build · Caddy in front.

## Locked-in ground rules (read before any work)

These are settled. Don't re-ask them, and don't quietly work against them. The reasons and dates are in
`docs/DECISIONS.md` (local, not in git). If something here seems wrong, raise it with David; don't route
around it.

1. **Most visitors are NOT signed in**, first-time and repeat alike. Posts are public unless the poster
   made them private. Judge every feature from the signed-out visitor's side first. If something works
   only for signed-in members, tell David plainly, as a decision, in the same message. Installed web apps
   (home-screen / "Add to Dock") keep their own storage and start signed out.
2. **The site is NOT federated.** It has no contact with other Mastodon servers, by design. Never change
   the federation allowlist or limited-federation mode. Never describe anything as "federation works".
   An unsigned ActivityPub request getting 401 means the isolation is working.
3. **No Docker or Colima, ever, and no Rails on the Mac.** The Mac is for git, yarn and editing only.
   Ruby, Rails, RSpec, RuboCop, migrations and the console run **only on the server**, through the
   personal skills below. `bin/dev`, `public/packs-dev` and localhost:3000 belong to a retired setup.
4. **Code flows one way:** commit and push from the Mac, then `git pull` on the server. Never edit code
   in the server's live checkout.
5. **Every deploy or server change ends with the tamper check, then `bless-last`**, approving only
   changes that are explained. Anything unexplained is a possible break-in until proven otherwise.
6. **Ask David before changing things.** Analyze, explain in plain words (he isn't a developer by trade),
   then wait for his OK. The exception is work he has explicitly authorized for that session.
7. **Never call a failure "pre-existing" or "baseline" without reading its actual error message.** A
   green check proves only what it actually ran. When verifying, compare test-failure _lists_, not counts.
8. **Upstream is the reference.** Before a framework, gem or Mastodon upgrade, check what upstream
   Mastodon/glitch-soc changed alongside it. Mastodon patches Rails internals.

## Where the truth lives

| What                                                                                      | Where                                                                                                                              |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| How the live site is wired (request path, real-time, jobs, email, auth, deploy, runtimes) | `docs/HOW_MIACIVEZZA_IS_WIRED.md` (local, gitignored, code-verified). **Read it before touching the live site.**                   |
| Standing decisions, with dates and reasons                                                | `docs/DECISIONS.md` (local, gitignored)                                                                                            |
| Community Directory architecture                                                          | `docs/CLAUDE.md`                                                                                                                   |
| Procedures (deploy, tests on the server, security patches, glitch-soc upgrades, health)   | Personal skills in `~/.claude/skills`: `miacivezza-deploy`, `server-test-run`, `security-update`, `glitch-upgrade`, `health-check` |

Start a session with the `health-check` skill. Keep the wiring doc and the decisions log updated in the
same piece of work as any change they describe.

## Commands on the Mac

### JavaScript (yarn is fine on the Mac)

```bash
yarn lint          # ESLint + Stylelint
yarn typecheck     # TypeScript tsc --noEmit
yarn test:js run   # Vitest (single file: yarn test:js run path/to/file.test.tsx)
yarn build:production
yarn i18n:extract  # extract i18n strings to en.json
npx --no-install oxfmt --check   # formatting (read the list of flagged files)
```

- `.jsx` files get **no** ESLint coverage. Parse-check them with `@babel/parser` (see the deploy skill).
- After a dependency change, `yarn lint:js` can give a false green from its cache. Use
  `yarn eslint --no-cache`.
- The Mac's `/usr/bin/ruby` is 2.6 and flags modern syntax (`foo(bar:)`, `super(**)`) as errors that
  aren't real. The server's eager load is the real check.

### Ruby (server only)

Use the `server-test-run` skill for specs and RuboCop/haml-lint (a throwaway clone with production-safety
checks), and the `miacivezza-deploy` skill for migrations and restarts. Never run `bundle exec ...`
on the Mac.

## Architecture

### Backend (Rails)

```
app/
  controllers/    # REST API + web controllers
  models/         # ActiveRecord models
  services/       # business logic (e.g., community_directory_generator.rb)
  workers/        # Sidekiq async jobs (check config/sidekiq.yml lists the worker's queue)
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
  hooks/useCommunityLiveRefresh.ts      # live updates: push (signed in), 20 s check (signed out), wake refresh
  store/              # Redux store setup (useAppSelector, useAppDispatch)
  api.ts              # axios instance with auth headers
  identity_context.tsx  # withIdentity HOC, signedIn/accountId
  entrypoints/        # Vite entrypoints
  styles/             # SCSS (application.scss is the root import)
```

### Streaming server

`streaming/`: a standalone Node.js process (port 4000) that serves WebSocket live updates. **It requires
a sign-in token for every connection**, so signed-out visitors rely on the 20-second check instead. A
pushed message must carry a `payload`, or the server silently drops it. A `mastodon-web` restart does not
restart streaming.

### Vite build

- Production output: `public/packs/` (built on the server by `assets:precompile`; never delete it, since
  open pages still reference older chunks)
- Config: `vite.config.mts`, path aliases: `~/` and `@/` both resolve to `app/javascript/`

## Routing Pattern (Three-Layer Lazy-Loading)

To add a new page:

1. **`async-components.js`**: add a named export: `export const MyPage = () => import('../my_page');`
2. **`ui/index.jsx`**: add `import { MyPage } from '../util/async-components'` and a `<WrappedRoute path='/my-path' component={MyPage} />`
3. **`config/routes/web_app.rb`**: add `get '/my-path/(*any)', ...` catch-all for the SPA

More specific routes must come before less specific ones in `ui/index.jsx`.

## State Management Patterns

- Root Redux state is an ImmutableRecord: both `state.foo` and `state.get('foo')` work.
- Sub-state trees use Immutable.js: use `.get()`, `.getIn()`, `.size` for Lists. Exception: the
  `server` reducer is a plain Redux Toolkit object (no `.getIn()`).
- Always import hooks from the store: `import { useAppSelector, useAppDispatch } from 'flavours/glitch/store';`
- Generated page components receive `params` (from react-router `match.params`, NOT hooks) and `multiColumn` from `<Bundle>`.

## Key Import Paths

```jsx
import { Column } from "flavours/glitch/components/column";
import { ColumnHeader } from "flavours/glitch/components/column_header";
import { LoadingIndicator } from "flavours/glitch/components/loading_indicator";
import { Avatar } from "flavours/glitch/components/avatar";
import { withIdentity } from "flavours/glitch/identity_context";
import api from "flavours/glitch/api";
import { Helmet } from "@unhead/react/helmet";
```

SVG icons: `import FooIcon from '@/material-icons/400-24px/foo.svg?react';`

## Community Directory Feature

A build-time scaffolding system that generates new community resource categories from an admin UI at
`/community_directory/admin`. It writes real Rails and React files to disk and injects routes.
**Full architecture: `docs/CLAUDE.md`.**

- Generated pages are thin wrappers around shared components in `app/javascript/flavours/glitch/components/community_directory/`.
- A single Redux reducer (`reducers/community_entries.js`) handles all categories via `categoryKey`.
- **Generating a new category has no current procedure.** The last categories (2026-06-07) were generated
  under the retired Docker setup and committed from the Mac. Before the next one, design and agree a
  procedure with David (e.g. run the generator in a throwaway server clone, bring the files to the Mac,
  commit, then deploy with migrations). Never run it against the live checkout.
- `community_directory_v2/` contains a standalone installable copy of the feature (`install_community_directory.sh`).
