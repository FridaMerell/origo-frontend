# Shared lib code

Cross-product hooks, utilities and the data-access layer. For shared UI
components, see [`app/components/README.md`](../components/README.md).

## Hooks & utilities used across products

| File | What it's for |
| --- | --- |
| `api-client.ts` | Low-level HTTP client (`fetchOrigoApi`, cookie helpers) everything else builds on. |
| `api-errors.ts` | Parses the Origo API's DRF-style error bodies — `firstErrorMessage()` (single message) and `readErrorBody()` (per-field errors), both never surfacing a raw non-JSON body. |
| `config.ts` | Env-derived constants and each product's `*_ENDPOINTS` objects. |
| `files.ts` | Normalizes uploaded-file references (`FileLike`) and builds the Vercel Blob proxy URL. |
| `formatters.ts` | `formatDate`/`formatDateShort` — Swedish-locale date display, shared by Flux and Verso. (Tempus keeps its own `app/tempus/formatters.ts` for domain-specific formats like `formatKm` and `parseLatLon`.) |
| `nav-progress.tsx` | Top-of-page loading indicator wired into `AppLink`'s pending navigation state. |
| `schemas.ts` | Every form's zod schema + inferred type — the single source of truth shared by forms and their server actions. See `app/components/form/README.md`. |
| `session.ts` | Session/CSRF cookie read & write helpers. |
| `tenant.ts` | `TenantId` and per-tenant config (name, public paths reachable without a session). |
| `tenant-links.ts` | Cross-product nav links (`APP_LINKS`, `appHref`) — the "byt produkt" switcher in every sidebar/toolbar. |
| `use-paginated-list.ts` | Generic client-side pagination hook: page state, reset-on-filter-change, loading/error. Pairs with `app/components/ui/Pager.tsx`. Not yet wired into Flux/Verso/Apsis, but built product-agnostic for that. |
| `user-context.tsx` | Logged-in user + user-directory context (`useUser`, `useUsers`, `formatUserName`, `getUserLabel`). |

## Data access layer (`dal.ts` + `dal/`)

`app/lib/dal.ts` is the barrel every product imports from
(`import { ... } from "@/app/lib/dal"`); it re-exports one file per product
under `app/lib/dal/`:

| File / folder | Product |
| --- | --- |
| `auth.ts` | Shared login/session bootstrap. |
| `account.ts` | Account, houses, invitations (cross-product "konto" area). |
| `apsis.ts` | Apsis posts. |
| `birdnet.ts` | BirdNET devices. |
| `flux.ts` | Flux projects/tasks/milestones/updates/documents. |
| `verso.ts` | Verso dashboard, ventures, bookings, expenses, updates. |
| `tempus/` | Tempus, split by subdomain: `species.ts`, `checklists.ts`, `observations.ts`, `routes.ts`, `geo.ts`, plus `shared.ts` for the pagination helpers and `index.ts` as the barrel. Kept as its own folder (rather than one flat file) because Tempus's DAL is large enough to need the split — see `app/tempus/ARCHITECTURE.md`. |

Two files here are generic enough to be genuinely product-agnostic, not just
"one file per product":

| File | What it's for |
| --- | --- |
| `client.ts` | `fetchList`/`fetchItem`/`buildQuery` — the base authenticated-fetch helpers every product's DAL file calls. |
| `pagination.ts` | `Page<T>`, `fetchPage()`, `paginationQuery()` — generic paginated-collection fetching. Currently only Tempus's DAL uses it (aliased under `TempusPage`/`fetchTempusPage` in `dal/tempus/shared.ts`), but it has no Tempus-specific assumptions baked in — use it directly for any new paginated `get_collection`-style endpoint. |

## Product-specific files that happen to live here

These are not meant for cross-product reuse — they're colocated in
`app/lib/` for historical reasons, not because more than one product uses
them. Prefer keeping genuinely new product-specific code inside that
product's own folder instead of adding more of these.

| File | Product |
| --- | --- |
| `apsis-context.tsx`, `apsis-providers.tsx` | Apsis |
| `birdnet-live.ts` | Tempus (BirdNET SSE stream) |
| `flux-progress.ts`, `flux-task-dates.ts`, `task-panel-context.tsx` | Flux |
| `weather-client.ts` | Verso |
| `selected-facility.ts` | Resolves the selected Verso facility/house from its cookie. |
