---
name: new-subdomain
description: >-
  Stand up a brand-new Origo tenant / subdomain (like verso or flux) from a design kit —
  a set of brand colors, fonts, radii, shadows, and a personality note. Use this whenever
  someone wants to "add a new subdomain", "start a new site/app under origo", "spin up
  another tenant", "create the <name>.origo.test app", or hands over a design kit / brand
  kit / style guide and wants it turned into a running section of the app. Covers the
  design-token wiring, the tenant registry, the proxy/route-group plumbing, and the
  minimum shell + login + home so the subdomain boots.
---

# Starting a new subdomain from a design kit

Origo is one Next.js app serving several **tenants**, each on its own subdomain
(`verso.origo.test`, `flux.origo.test`, …). The `proxy.ts` middleware maps the
subdomain to a route group under `app/<tenant>/` and every tenant re-themes the
same shared components through CSS custom properties scoped to
`[data-theme="<tenant>"]`.

A **design kit** is the raw material for that theme: a palette, a type pairing,
corner radii, shadow feel, and a one-line personality (Verso is "the ledger",
Flux is "the bench"). Your job is to translate the kit into token blocks and
wire up just enough structure that the subdomain renders.

## Before you start — get these from the design kit

If the kit is missing any of this, ask rather than guess; the palette especially
needs real values because every shared component reads from it.

- **Tenant id** — one lowercase word, URL-safe (`atlas`, `verso`). This is the
  subdomain, the folder name, and the `data-theme` value. Everything keys off it.
- **Display name** — human-facing (`Atlas`).
- **Light palette** — the full set of role tokens listed in
  `references/token-map.md` (bg/surface/border/text/accent/semantic/link/focus).
- **Dark palette** — same roles, dark values. If the kit only gives light, derive
  a dark set and flag it for review.
- **Type pairing** — display face + body face (+ mono if given), plus whether the
  scale should feel tight/large like Flux or roomy/editorial like Verso.
- **Shape & depth** — base radius, card radius, shadow intensity.
- **Personality line** — informs nav layout and copy tone, not tokens.

## Steps

Work in this order. Steps 1–4 make the theme real; 5–7 make the route resolve;
8–9 (data, public routes) come later as the tenant grows.

### 1. Fonts — `app/styles/tokens/fonts.css`

Add any new families to the single Google Fonts `@import` URL (keep it one
request, `&family=` separated, `display=swap` at the end). Skip faces already
listed.

### 2. Colors — `app/styles/tokens/colors.css`

Add three blocks for the new tenant, mirroring the verso/flux pattern exactly:

- `[data-theme="<id>"]{ … }` — the **light** palette (light is the default).
  Include `--shadow-color` (as `r,g,b`), and `--radius` / `--radius-card` if the
  kit's shape differs from the shared defaults.
- `@media (prefers-color-scheme: dark){ [data-theme="<id>"]:not([data-mode="light"]){ … } }`
  — dark palette, applied when the OS is dark and the user hasn't forced light.
- `[data-theme="<id>"][data-mode="dark"]{ … }` — same dark values, for when the
  user explicitly toggles dark.

The dark palette is duplicated in the last two blocks on purpose — keep them
identical. `references/token-map.md` lists every variable and what it's for.

Do **not** touch `globals.css` — its `@theme inline` block already maps every
`--<token>` to a Tailwind utility generically, so new tenant values flow through
automatically.

### 3. Typography — `app/styles/tokens/typography.css`

Add one `[data-theme="<id>"]{ … }` block: `--font-display`, `--font-body`,
`--font-mono`, the `--text-*` scale, `--leading-*`, `--tracking-*`. Copy verso's
or flux's block as the starting point depending on which personality is closer.

### 4. Effects — `app/styles/tokens/effects.css`

Add one `[data-theme="<id>"]{ … }` block: `--shadow-sm/md/lg` (and
`--shadow-glow` if the kit wants a glow), `--ease-standard`, `--duration-fast`,
`--duration-normal`, `--border-width`.

### 5. Register the tenant — `app/lib/tenant.ts`

Add the id to the `TenantId` union and an entry to `TENANTS` with its `name`.
`proxy.ts` resolves any registered tenant to `app/<id>/…` with no further
changes.

### 6. Route group — `app/<id>/`

Create the minimum that boots. Use `references/route-templates.md` for the file
contents; adapt imports and the personality of the shell.

- `layout.tsx` — `metadata`, wraps children in the tenant's data providers (none
  yet is fine — just render the shell), renders `<{Id}Shell>`.
- `<id>-shell.tsx` — `"use client"`. Owns the light/dark `mode` state in
  `localStorage` under `"<id>-mode"`, renders
  `<div data-theme="<id>" data-mode={mode ?? undefined} className="… bg-bg text-text font-body">`
  with the nav and `<main>`. Special-case `pathname === "/login"` to render
  without the nav (see verso-shell / flux-shell).
- `page.tsx` + `Home.tsx` — landing screen. `Home.tsx` is `"use client"` and
  builds from `app/components/ui/*` (Card, Icon, Avatar, …) so it inherits the
  theme.
- `login/page.tsx` — reuse the shared `LoginForm` from `app/login/login-form`,
  wrapped in the tenant's `<Card>` and `<LogoMark>`. `redirectTo="/"`.
- `ui/Logo.tsx` + `ui/LogoMark.tsx` — brand mark. `Logo` is an inline `<svg>`
  using `fill="currentColor"` so `text-accent` colors it; `LogoMark` stacks
  `Logo` + the display name.
- A nav component — `sidebar.tsx` + `mobile-nav.tsx` (Verso, side rail) or
  `toolbar.tsx` (Flux, floating bar). Pick whichever fits the personality; both
  take `{ mode, onToggleMode }`.

### 7. `next.config.ts`

Add `<id>.origo.test` to `allowedDevOrigins`.

### 8. Data layer — only when the tenant needs its own API data

Later, as real screens land: add `<ID>_ENDPOINTS` and any cookies to
`app/lib/config.ts`, `get<Thing>()` functions + types to `app/lib/dal.ts`, a
`app/lib/<id>-context.tsx` provider, and optionally an `app/lib/<id>-providers.tsx`
server component that fetches and hydrates it (mirror `flux-providers.tsx`).

DAL helpers return `[]` / `null` when there's no session, so a server component
that fetches won't crash for anonymous visitors — it just renders empty. Write
`Home.tsx` and any provider to handle the empty case cleanly (empty states, no
non-null assertions on fetched data).

Server actions that create data should still take `author` (or equivalent) from
`getCurrentUser()` and bail with an error if it's `null` — see
`app/actions/apsis.ts`.

### 9. Public pages — only if some routes should work without a session

By default `proxy.ts` redirects every route on every tenant to `/login` unless
there's a valid session (it also does a blocking `fetch` to the auth API on each
GET to check). A tenant opts specific routes out via `publicPaths` in its
`TENANTS` entry in `app/lib/tenant.ts`:

```ts
tempus: { name: "Tempus", publicPaths: ["/"] },
```

`"/"` matches only the tenant root; any other prefix (`"/blog"`) also covers its
sub-paths. `proxy.ts` reads this through `isPublicPath()` and skips the login
redirect (and the auth round-trip) for those paths. `/login` is always public.

When a tenant has public routes, also:

- **Nav** — render "log in" vs "log out" from `useUser()` instead of always
  showing logout (see `app/tempus/nav.tsx`). `getCurrentUser()` returns `null`
  for anonymous visitors and the shared providers already tolerate that.
- **Backend** — a public page that reads an API needs that endpoint to allow
  anonymous access. Origo's DRF default is `IsAuthenticated`, so the viewset in
  the `project_management` repo must set `permission_classes =
  [IsAuthenticatedOrReadOnly]` (or `AllowAny`). Without it the page loads but its
  data is 401 → empty. Flag this as a separate backend change; it's not in this
  repo.

Note: `proxy.ts` is the authorization choke point today, which the Next docs
advise against. If this grows, the better model is proxy never redirecting and
each protected `layout.tsx` calling `verifySession()` — a cross-tenant refactor,
not something to take on just to add one public page.

## Checklist before handing off

- `bg-bg`, `text-text`, `text-accent`, `font-display` etc. render with the new
  palette when you visit the subdomain — nothing falls back to the bare
  `:root` black/white.
- OS dark mode flips the palette; the in-app toggle also flips it and persists.
- `/login` renders without the nav; a logged-in visit to `/` shows `Home`.
- Anonymous visit to `/` either redirects to `/login` (gated tenant) or renders
  (a tenant with `publicPaths`) — whichever was intended, with nav chrome that
  matches the logged-out state.
- `references/token-map.md` — no role token left undefined (undefined ones
  silently break shared components).

## References

- `references/token-map.md` — every design token, its role, and which kit input
  feeds it. Read this while filling in step 2–4.
- `references/route-templates.md` — copy-paste starting points for the step 6
  files.
