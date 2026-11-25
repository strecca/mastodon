# Community Directory: architecture reference

> **Status (updated 2026-11-25):** this is the original design document for the Community Directory
> (May 2026). **The admin generator it describes was removed on 2026-11-25.** That covers "Layer 2"
> (the form builder at `/community_directory/admin`), "Layer 3" (`community_directory_generator.rb`),
> the `generate` / category-edit endpoints and `community_directory_v2/`. Those parts are kept here only
> as history; new categories are built with the personal skill `community-category`. Still current:
> Layer 1 (the shared components), Layer 4 (the public hub), the thin-wrapper pattern, the generic Redux
> layer, the `config.json` schema, the permissions model and the routing patterns. Later additions
> (moderation status, trust/rate limits, image fields, translations, sorting, live refresh, the shared
> `CommunityCategoryController`) are in the code and in memory `project_community_directory`.
> For the ground rules and the live setup, read the repo `CLAUDE.md`, `docs/HOW_MIACIVEZZA_IS_WIRED.md`
> and `docs/DECISIONS.md`.

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

| File                                                     | Purpose                                                   |
| -------------------------------------------------------- | --------------------------------------------------------- |
| `features/community_artists/config.json`                 | Field definitions, layout, groups, filter config          |
| `features/community_artists/index.jsx`                   | List page — thin wrapper importing shared `EntryList`     |
| `features/community_artists/show/index.jsx`              | Detail page — thin wrapper importing shared `EntryDetail` |
| `features/community_artists/new/index.jsx`               | Create form — thin wrapper importing shared `EntryForm`   |
| `features/community_artists/edit/index.jsx`              | Edit form — thin wrapper importing shared `EntryForm`     |
| `app/models/community_artist.rb`                         | Rails model with validations + ILIKE search scope         |
| `app/controllers/api/v1/community_artists_controller.rb` | CRUD API with owner authorization                         |
| `db/migrate/..._create_community_artists.rb`             | PostgreSQL migration                                      |

### Existing files auto-injected into:

| File                                   | What's injected                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `features/ui/util/async-components.js` | 4 lazy-load exports (CommunityArtists, CommunityArtistsShow, CommunityArtistsNew, CommunityArtistsEdit) |
| `features/ui/index.jsx`                | Import names + 4 `<WrappedRoute>` entries                                                               |
| `config/routes/api.rb`                 | `resources :community_artists, only: [:index, :show, :create, :update, :destroy]`                       |
| `config/routes/web_app.rb`             | `/community_artists/(*any)` for SPA routing                                                             |

### NOT modified per category (by design):

- `reducers/index.ts` — registered once during initial install
- `reducers/community_entries.js` — single reducer handles ALL categories via `categoryKey`
- `actions/community_entries.js` — single actions module handles ALL categories via factory pattern
- The public hub at `/community` — reads categories from API at runtime

## 4. The Thin Wrapper Pattern

Generated feature pages are intentionally thin (15-20 lines each). They import a shared
component and pass the category's `config.json`. Example for `community_artists/index.jsx`:

```jsx
import { Column } from "flavours/glitch/components/column";
import { ColumnHeader } from "flavours/glitch/components/column_header";
import { EntryList } from "flavours/glitch/components/community_directory/entry_list";
import config from "./config.json";

const CommunityArtists = ({ multiColumn }) => {
  return (
    <Column bindToDocument={!multiColumn} label={"Community Artists"}>
      <ColumnHeader
        title={"Community Artists"}
        icon="address-book"
        multiColumn={multiColumn}
        showBackButton
      />
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
  "groups": [{ "name": "details", "label": "Artist Details", "columns": 2 }]
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

| Role                   | Can See                                                 | Can Do                                                       |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| Public (not logged in) | All categories, all entries, all details, search/filter | Browse only                                                  |
| Logged-in subscriber   | Everything public sees                                  | Add new entries, edit entries they own                       |
| Admin                  | Everything subscriber sees                              | Access `/community_directory` admin, generate new categories |

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
import { Column } from "flavours/glitch/components/column";
import { ColumnHeader } from "flavours/glitch/components/column_header";
import { LoadingIndicator } from "flavours/glitch/components/loading_indicator";
import { RelativeTimestamp } from "flavours/glitch/components/relative_timestamp";
import { Avatar } from "flavours/glitch/components/avatar";
import { identityContextPropShape, withIdentity } from "flavours/glitch/identity_context";
import { useAppDispatch, useAppSelector } from "flavours/glitch/store";
import api from "flavours/glitch/api"; // axios instance with auth headers
import CategoryIcon from "@/material-icons/400-24px/category.svg?react";
```

### Helmet:

```jsx
import { Helmet } from "@unhead/react/helmet";
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

There's no local Rails or Docker environment (retired). The Mac runs git and yarn only; Rails,
migrations and specs run on the server through the personal skills (see the repo `CLAUDE.md`).

**New categories are built in code with the `community-category` skill** (decided 2026-11-25, D17 in
`docs/DECISIONS.md`): copy the closest live category, wire every shared registry, and verify with its
`integration_check.sh`. The generator was removed; git history has it if it's ever needed.

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
