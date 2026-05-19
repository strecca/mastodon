KEY information:

Contents: Mac Intel, Node v24, VS Code terminal, no sudo, no Windows assumptions, think-ahead error scanning preferences. I do a lot of Development environment testing so that I can run apps in my Firefox or Chrome browser at a http://localhost address.  # Global Preferences

- Mac Intel development machine
- Node v24.12.0
- VS Code terminal for all commands
- Never use `sudo` for npm installs
- Never generate Windows-specific commands or paths
- When troubleshooting errors, scan the entire script for similar
  issues before responding — don't just fix the reported line
- Always think ahead for errors that logically follow from the same pattern
- No placeholder code or generic templates — full production implementations
- Never suggest a Brew Install of any component to avoid Homebrew’s dependency management or to ensure compatibility with Apple’s approved software paths
"This is a scaffolding tool, not a runtime feature. Read docs/COMMUNITY_DIRECTORY_ARCHITECTURE.md before any changes. Generated pages are thin wrappers — modify shared components at components/community_directory/, not individual feature pages."

# Community Directory — Architecture & Design Document

> This document captures the complete architectural decisions, design patterns, and technical
> specifications for the Community Directory scaffolding system. It was produced during the
> initial design and implementation session. Any AI tool (Claude Code, etc.) or developer
> working on this feature should read this document before making changes to any
> `community_directory` or `community_*` files.

## 1. What This System Is

The Community Directory is a **build-time code generation engine** that lets a Mastodon admin
create new community resource categories (artists, restaurants, events, housing, mutual aid,
etc.) from a form builder UI. When the admin clicks "Generate," the system physically writes
all necessary files — React pages, Rails migration, model, controller — and injects routes
into the existing glitch-soc wiring files. After a Vite restart, the new category is live.

This is NOT a runtime dynamic system. It is a scaffolding tool that writes actual source files
to disk, similar to `rails generate scaffold`.

## 2. The Three Layers

### Layer 1: Shared Components (written once, used by ALL generated features)

Location: `app/javascript/flavours/glitch/components/community_directory/`

These are smart React components that know how to render list pages, detail pages, forms,
cards, and search filters — all driven by a `config.json` file that defines the fields,
layout, groups, and filter options for a given category.

Files:
- `entry_list.jsx` — Filterable list page with search, checkbox filters, auth-gated add button
- `entry_card.jsx` — Preview card in list view with account info, preview fields, truncation
- `entry_detail.jsx` — Full detail page with grouped field layout, owner-only edit link
- `entry_form.jsx` — Create/edit form with grouped layout, column positioning, all widget types
- `search_filters.jsx` — Text search input + checkbox filter groups for searchable option fields

### Layer 2: Admin Scaffolding Tool (admin-only)

Location: `app/javascript/flavours/glitch/features/community_directory/`

The form builder UI where the admin designs a category's fields, groups, and layout.
Routes: `/community_directory` (landing) and `/community_directory/admin` (form builder).

Files:
- `index.jsx` — Admin landing: lists existing generated categories with entry counts
- `admin/index.jsx` — Form builder: category name/display/description, groups, fields, preview, generate button
- `admin/components/field_editor.jsx` — Individual field config (label, type, options, required, searchable, column, group)
- `admin/components/form_preview.jsx` — Live preview of the form layout as it would appear to users

### Layer 3: Rails Generator Service

Location: `app/services/community_directory_generator.rb`

The Ruby service that receives the form config and physically writes all files. Called by
the admin API controller when the admin clicks "Generate."

### Layer 4: Public Hub

Location: `app/javascript/flavours/glitch/features/community_hub/index.jsx`

The public landing page at `/community` that shows a scrolling grid of category cards.
Anyone (logged in or not) can see this page. It queries the public API to discover all
generated categories at runtime — new categories appear automatically after generation.

## 3. What Gets Generated Per Category

When the admin generates "artists," the system creates:

### New files written to disk:
| File | Purpose |
|---|---|
| `features/community_artists/config.json` | Field definitions, layout, groups, filter config |
| `features/community_artists/index.jsx` | List page — thin wrapper importing shared `EntryList` |
| `features/community_artists/show/index.jsx` | Detail page — thin wrapper importing shared `EntryDetail` |
| `features/community_artists/new/index.jsx` | Create form — thin wrapper importing shared `EntryForm` |
| `features/community_artists/edit/index.jsx` | Edit form — thin wrapper importing shared `EntryForm` |
| `app/models/community_artist.rb` | Rails model with validations + ILIKE search scope |
| `app/controllers/api/v1/community_artists_controller.rb` | CRUD API with owner authorization |
| `db/migrate/..._create_community_artists.rb` | PostgreSQL migration |

### Existing files auto-injected into:
| File | What's injected |
|---|---|
| `features/ui/util/async-components.js` | 4 lazy-load exports (CommunityArtists, CommunityArtistsShow, CommunityArtistsNew, CommunityArtistsEdit) |
| `features/ui/index.jsx` | Import names + 4 `<WrappedRoute>` entries |
| `config/routes/api.rb` | `resources :community_artists, only: [:index, :show, :create, :update, :destroy]` |
| `config/routes/web_app.rb` | `/community_artists/(*any)` for SPA routing |

### NOT modified per category (by design):
- `reducers/index.ts` — registered once during initial install
- `reducers/community_entries.js` — single reducer handles ALL categories via `categoryKey`
- `actions/community_entries.js` — single actions module handles ALL categories via factory pattern
- The public hub at `/community` — reads categories from API at runtime

## 4. The Thin Wrapper Pattern

Generated feature pages are intentionally thin (15-20 lines each). They import a shared
component and pass the category's `config.json`. Example for `community_artists/index.jsx`:

```jsx
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryList } from 'flavours/glitch/components/community_directory/entry_list';
import config from './config.json';

const CommunityArtists = ({ multiColumn }) => {
  return (
    <Column bindToDocument={!multiColumn} label={'Community Artists'}>
      <ColumnHeader title={'Community Artists'} icon='address-book' multiColumn={multiColumn} showBackButton />
      <EntryList config={config} multiColumn={multiColumn} />
    </Column>
  );
};
export default CommunityArtists;
```

This means bug fixes or improvements to the shared components propagate to every
generated category automatically.

## 5. The Generic Redux Layer

### Actions: `actions/community_entries.js`

Uses a factory pattern. All action types include the category key:
```
COMMUNITY_ENTRIES/artists/FETCH_SUCCESS
COMMUNITY_ENTRIES/events/CREATE_SUCCESS
```

Functions accept `categoryKey` and `apiEndpoint` from config.json:
- `fetchEntries(categoryKey, apiEndpoint, query, page)`
- `fetchEntry(categoryKey, apiEndpoint, id)`
- `createEntry(categoryKey, apiEndpoint, formData)`
- `updateEntry(categoryKey, apiEndpoint, id, formData)`
- `deleteEntry(categoryKey, apiEndpoint, id)`
- `clearCurrentEntry(categoryKey)`

### Reducer: `reducers/community_entries.js`

Single reducer storing state for ALL categories in an ImmutableMap keyed by `categoryKey`:
```
state.community_entries = ImmutableMap({
  artists: { entries: List, entriesLoading, currentEntry, total, page, pages, error },
  events: { entries: List, entriesLoading, currentEntry, total, page, pages, error },
  ...
})
```

Parses action type prefix `COMMUNITY_ENTRIES/{categoryKey}/{ACTION}` to route to correct bucket.

## 6. Config JSON Schema

Each generated category has a `config.json` that drives all shared components:

```json
{
  "category_key": "artists",
  "display_name": "Community Artists",
  "description": "Discover local artists in our community",
  "icon": "category",
  "table_name": "community_artists",
  "api_endpoint": "/api/v1/community_artists",
  "fields": [
    {
      "db_name": "artist_name",
      "label": "Artist Name",
      "widget": "text",
      "required": true,
      "searchable": true,
      "options": [],
      "column": "full",
      "group": "default"
    },
    {
      "db_name": "medium",
      "label": "Medium",
      "widget": "select",
      "required": false,
      "searchable": true,
      "options": ["Painting", "Sculpture", "Digital", "Photography"],
      "column": "1",
      "group": "details"
    }
  ],
  "groups": [
    { "name": "details", "label": "Artist Details", "columns": 2 }
  ]
}
```

### Widget types:
- `text` → `<input type="text">`, PostgreSQL `string`
- `textarea` → `<textarea>`, PostgreSQL `text`
- `select` → `<select>` with options, PostgreSQL `string`
- `checkboxes` → multiple checkboxes, PostgreSQL `jsonb` (array)
- `radio` → radio buttons with options, PostgreSQL `string`
- `date` → `<input type="date">`, PostgreSQL `date`
- `url` → `<input type="url">`, PostgreSQL `string`
- `email` → `<input type="email">`, PostgreSQL `string`
- `number` → `<input type="number">`, PostgreSQL `integer`

### Column positioning:
- `"full"` → full width
- `"1"` → left column in a 2-column group
- `"2"` → right column in a 2-column group

### Searchable flag:
- For `text`/`textarea`/`select`/`radio`/`url`/`email`: generates PostgreSQL `ILIKE` search scope
- For `select`/`checkboxes`/`radio` with options: renders checkbox filter groups in the UI
- Searchable fields get database indexes

## 7. Permissions Model

| Role | Can See | Can Do |
|---|---|---|
| Public (not logged in) | All categories, all entries, all details, search/filter | Browse only |
| Logged-in subscriber | Everything public sees | Add new entries, edit entries they own |
| Admin | Everything subscriber sees | Access `/community_directory` admin, generate new categories |

### How ownership works:
- Every entry has an `account_id` foreign key to the Mastodon `accounts` table
- On create, `current_account` is assigned as owner
- Edit/delete restricted to `entry.account_id == current_account.id || current_account.admin?`
- The `withIdentity` HOC provides `identity.accountId` and `identity.signedIn` to React components
- The shared `EntryDetail` component checks `identity.accountId === entry.account.id` to show/hide the edit link

## 8. Glitch-soc Integration Patterns

### Routing architecture (three-layer lazy-loading):
1. `async-components.js` — registry of factory functions returning `import()` calls
2. `ui/index.jsx` — `<WrappedRoute>` components pass factory to `<Bundle>`
3. `<Bundle>` — executes import on mount, shows spinner, renders component with `params` and `multiColumn` props

### Generated pages receive props from Bundle:
- `params` (from react-router match.params) — NOT from hooks
- `multiColumn` (boolean)

### State access patterns:
- Root state is an ImmutableRecord — both `state.foo` and `state.get('foo')` work
- Use `useAppSelector` and `useAppDispatch` from `flavours/glitch/store`
- Sub-state is Immutable: use `.get()`, `.getIn()`, `.size` for Lists, `fromJS()` for conversion

### Key imports:
```jsx
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { RelativeTimestamp } from 'flavours/glitch/components/relative_timestamp';
import { Avatar } from 'flavours/glitch/components/avatar';
import { identityContextPropShape, withIdentity } from 'flavours/glitch/identity_context';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';
import api from 'flavours/glitch/api';  // axios instance with auth headers
import CategoryIcon from '@/material-icons/400-24px/category.svg?react';
```

### Helmet:
```jsx
import { Helmet } from '@unhead/react/helmet';
```

### Navigation:
- `useHistory` from `react-router-dom` for programmatic navigation
- `<Link to="...">` for declarative links

## 9. File Locations Reference

### Rails backend:
```
app/services/community_directory_generator.rb          # The scaffolding engine
app/controllers/api/v1/community_directory_controller.rb    # Admin API (generate, list)
app/controllers/api/v1/community_directory_public_controller.rb  # Public API (browse categories)
```

### Redux layer:
```
app/javascript/flavours/glitch/actions/community_directory.js  # Admin actions (fetchCategories, generateCategory)
app/javascript/flavours/glitch/actions/community_entries.js    # Generic CRUD (all categories)
app/javascript/flavours/glitch/reducers/community_directory.js # Admin state
app/javascript/flavours/glitch/reducers/community_entries.js   # All categories state
```

### Shared React components:
```
app/javascript/flavours/glitch/components/community_directory/entry_list.jsx
app/javascript/flavours/glitch/components/community_directory/entry_card.jsx
app/javascript/flavours/glitch/components/community_directory/entry_detail.jsx
app/javascript/flavours/glitch/components/community_directory/entry_form.jsx
app/javascript/flavours/glitch/components/community_directory/search_filters.jsx
```

### Admin UI:
```
app/javascript/flavours/glitch/features/community_directory/index.jsx
app/javascript/flavours/glitch/features/community_directory/admin/index.jsx
app/javascript/flavours/glitch/features/community_directory/admin/components/field_editor.jsx
app/javascript/flavours/glitch/features/community_directory/admin/components/form_preview.jsx
```

### Public hub:
```
app/javascript/flavours/glitch/features/community_hub/index.jsx
```

### Styles:
```
app/javascript/flavours/glitch/styles/mastodon/community_directory.scss
```

### Wiring files modified during install:
```
app/javascript/flavours/glitch/features/ui/util/async-components.js  # 3 lazy loaders added
app/javascript/flavours/glitch/features/ui/index.jsx                  # 3 routes + imports added
app/javascript/flavours/glitch/reducers/index.ts                      # 2 reducers registered
app/javascript/flavours/glitch/styles/application.scss                # stylesheet import added
config/routes/api.rb                                                   # admin + public API routes
config/routes/web_app.rb                                               # SPA catch-all routes
```

## 10. API Endpoints

### Admin (requires admin auth):
- `GET /api/v1/community_directory/categories` — list all generated categories
- `POST /api/v1/community_directory/generate` — trigger scaffolding with form config payload

### Public (no auth):
- `GET /api/v1/community_directory_public` — list all categories with counts (for hub page)

### Per-category (generated, e.g. for "artists"):
- `GET /api/v1/community_artists` — list entries (supports `?q=search&page=1`)
- `GET /api/v1/community_artists/:id` — show single entry
- `POST /api/v1/community_artists` — create entry (auth required)
- `PUT /api/v1/community_artists/:id` — update entry (owner or admin)
- `DELETE /api/v1/community_artists/:id` — delete entry (owner or admin)

## 11. Routes

### Frontend (React):
- `/community` — public hub (category card grid)
- `/community_directory` — admin landing (category list)
- `/community_directory/admin` — admin form builder
- `/community_artists` — generated category list page
- `/community_artists/new` — generated create form
- `/community_artists/:id` — generated detail page
- `/community_artists/:id/edit` — generated edit form

### Note on route ordering in ui/index.jsx:
More specific routes MUST come before less specific ones:
```jsx
<WrappedRoute path='/community_artists/new' exact ... />
<WrappedRoute path='/community_artists/:id/edit' exact ... />
<WrappedRoute path='/community_artists/:id' exact ... />
<WrappedRoute path='/community_artists' exact ... />
```

## 12. Development Workflow

### After generating a new category:
```bash
rm -rf public/packs-dev tmp/cache && bin/dev
```
Vite HMR does NOT reliably pick up new files written to disk. The full cache clear + restart
is the only dependable method.

### Dev environment:
- Mac Intel
- Node v24.12.0
- Docker-based Mastodon dev
- VS Code terminal for all commands
- Repository: https://github.com/TruthTriumphs/glitch-soc-mastodon

## 13. Dependencies

- `kaminari` gem — used by generated controllers for `.page().per()` pagination
- Immutable.js — state management (already in glitch-soc)
- react-intl — i18n (already in glitch-soc)
- react-router-dom — routing (already in glitch-soc)

## 14. Design Decisions & Rationale

**Why build-time scaffolding instead of runtime dynamic rendering?**
Generated files can be inspected, debugged, and version-controlled. Each category's code is
visible in the repo. No runtime interpretation layer means no performance penalty and no
security surface for JSON injection.

**Why thin wrappers instead of per-category Redux?**
One generic reducer + one actions module handles unlimited categories. Bug fixes to shared
components propagate everywhere. Adding a new category is zero Redux work.

**Why config.json per feature instead of a database config table?**
The config drives both the React UI and the Rails backend. Having it as a static JSON file
in the feature folder means Vite can import it at build time with zero API calls. It also
serves as documentation of the category's schema.

**Why separate public hub (`community_hub`) from admin (`community_directory`)?**
The admin tool is never seen by the public. The hub is always visible. Separating them avoids
auth-gating complexity in the hub and keeps the admin namespace clean.

## 15. Known Limitations & Future Work

- No drag-and-drop field reordering in the form builder (structured add/remove/move only)
- No image upload field type (would need ActiveStorage integration)
- No i18n for generated display names (hardcoded strings in config.json)
- Generated pages use `intl.formatMessage` but the message IDs are constructed at generation time,
  so translations need manual addition to locale files
- The persistent "Explore our Community Directory" header/banner mentioned in requirements
  has not yet been implemented — it would go in the navigation panel component

# WHERE WE START IN THIS SESSION: This is MacPro2020:mastodon davidh$ writing now: It is May 18, 2026 around 09:50 as I begin. On May 17 my chat conversation with Claude Opus 4.6 Extended produced the above content and files. ALL OF THE CHANGES IN THE ABOVE SCRIPT HAVE BEEN MADE MANUALLY. I am running a Vite localhost Development environment which is actually inside a Docker environment. I am pulling from the mastodon glitch-soc fork in github but have not necessarily pulled in all of the glitch-soc and mastodon mail merges or changes. admin
@admin
500

localhost:3000: About · Profiles directory · Privacy policy

Mastodon: About · Get the app · Keyboard shortcuts · View source code · v4.6.0-alpha.7+glitch
My problem that you will assist to solve is that once I have accessed http://localhost:3000/community_directory/admin and completed building the fields for a table that should be named 'community_artists' I then click the "Generate Community Feature" and perhaps 3 seconds of processing passes before a red highlighted text message reports at the top of the form 'Request failed with status code 500'  I tried twice and I see no evidence that a single file has been written.   
I am suspicious of community_directory_v2/app/javascript/flavours/glitch/components/community_directory/entry_list.jsx  -- it refers to getting values from a 'config.json' file and I see none inside of this whole application. 
I A WONDERING IF IT IS A PROBLEM WITH RUBY WRITE  