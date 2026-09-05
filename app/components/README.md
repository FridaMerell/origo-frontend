# Shared components

Product-agnostic building blocks used across Verso, Flux, Tempus and Apsis.
For the form-specific pattern (schema → action → form), see
[`form/README.md`](./form/README.md) instead.

## `app/components/ui/`

| Component | What it's for |
| --- | --- |
| `Avatar` | Initials/color avatar, deterministic color per name. |
| `Badge` | Small colored label (`accent`/`secondary`/`success`/`warning`/`danger`/`neutral`). |
| `Button` | The base button — variants (`primary`/`secondary`/`ghost`/`paper`/`paper-bordered`), sizes, rounding. |
| `Card` | The base surface/panel wrapper used by nearly every list and section. |
| `CategoryTreeSelect` | Searchable dropdown over a parent/child category tree, with keyboard (Escape) and click-outside dismissal. |
| `Chip` | Compact tag/filter pill, similar to `Badge` but interactive-shaped. |
| `CurrentLocationButton` | "Use my location" button wrapping the browser geolocation API. |
| `DeleteButton` | Trash-icon button with the shared `useTransition`-while-pending + disabled pattern; takes `onDelete`, `label`, optional `showTitle`/`stopPropagation`/`className`. |
| `Drawer` | Slide-over panel (portal-rendered), with an optional built-in trigger button. |
| `FileUpload` | File picker that uploads to Vercel Blob via `app/lib/files.ts`. |
| `Gallery` | Thumbnail grid/lightbox for a list of uploaded files. |
| `GroupedList` | `<Card>`-based list grouped under labeled sections. |
| `Icon` | Wrapper around the `lucide-static` CDN icon set (mask-image technique) — see the note below. |
| `ListTable` | Minimal headerless/headered table for compact list rows. |
| `NotificationMenu` | The notification bell dropdown: unread count, mark-as-read, render-prop trigger (`children({ unreadCount, toggle, isOpen })`), optional `footer`. |
| `Pager` | Prev/label/next pagination control — `page`/`totalPages`/`onPageChange`, configurable label and button styling, `as="div"|"li"`. Pairs with `app/lib/use-paginated-list.ts`. |
| `PillSelect` | Segmented-button single-select (visually a row of pills, not a native `<select>`). |
| `Profile` | Account menu in the sidebar footer — thin wrapper around `NotificationMenu` adding the avatar/name trigger and a logout footer. |
| `ProgressBar` | Horizontal progress/percentage bar. |
| `Select` | Basic custom dropdown `<select>` replacement (single value, no search). |
| `Splash` | Full-screen tenant-branded loading/splash screen. |
| `use-dismissable-open` | Not a component — the shared hook (`{ open, setOpen, ref }`) behind every dropdown/menu here: closes on outside click or Escape. |

**Icons load from a CDN today** (`unpkg.com/lucide-static`), not the bundled
`lucide-react` package — this is a known reliability gap (see the Verso
sidebar fix that switched to bundled `lucide-react` icons instead). Prefer
importing specific icons from `lucide-react` directly in new code where
practical; `Icon` remains for the many existing `name="..."` call sites.

## `app/components/` (top level)

| File | What it's for |
| --- | --- |
| `page-crumb.tsx` | Breadcrumb row for Origo's theme-less root pages (`/docs`, `/konto`, `/join`, …). |
| `tenant-home.tsx` | Generic "you're logged in" landing content for a tenant root page. |

## Related, but colocated with `app/lib/` instead

Cross-product **hooks and utilities** (not React components) live in
`app/lib/`, catalogued in [`app/lib/README.md`](../lib/README.md) — e.g.
`use-paginated-list`, `api-errors`, `formatters`, `dal/pagination`.
