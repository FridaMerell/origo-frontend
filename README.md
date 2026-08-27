This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Code map

Multi-tenant frontend with two product areas, routed via `proxy.ts`, which resolves the tenant from the request hostname and rewrites to `/<tenant>` while also gating routes behind session auth.

- `app/verso/` — Verso product: booking/visit flow (`besok/`) and venture planning (`planera/`), plus `sidebar.tsx` and `verso-shell.tsx` for the app shell/layout.
- `app/flux/` — Flux product: projects, tasks, backlog, and timeline views, plus `flux-shell.tsx`, `toolbar.tsx`, and `product-switcher.tsx` for the app shell/layout.
- `app/login/`, `app/flux/login/`, `app/verso/login/` — login pages (shared + per-product).
- `app/actions/` — Next.js server actions (`auth.ts`, `booking.ts`, `venture.ts`, `flux.ts`) that mutate data via the backend API.
- `app/lib/` — shared client/server utilities:
  - `api-client.ts` — fetch wrapper for calling the backend API.
  - `config.ts` — API base URL, auth endpoints, cookie names.
  - `session.ts`, `dal.ts` — session/auth data access.
  - `tenant.ts` — hostname → tenant resolution (used by `proxy.ts`).
  - `*-context.tsx` (`user-context`, `facility-context`, `booking-context`, `venture-context`, `flux-context`) + `flux-providers.tsx` — React context providers for shared client state.
- `app/components/ui/` — shared, product-agnostic UI primitives (`Button`, `Card`, `Icon`, `Avatar`).
- `app/components/tenant-home.tsx` — tenant landing page component.
- `app/styles/tokens/` — design tokens (colors, typography, fonts, effects) as CSS.
- `proxy.ts` — tenant resolution + auth-gated routing/rewrites, run on every GET request.
- `flux-design/` — design reference material for the Flux product (not application code).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment variables

Copy `.env.example` to `.env` and fill in the values. See that file for the full
list; in short:

- `BLOB_READ_WRITE_TOKEN` — required, backs file upload/download via Vercel Blob
  (`app/api/upload`, `app/api/files`). Run `vercel env pull` to get it locally.
- `ORIGO_API_URL`, `ORIGO_COOKIE_DOMAIN` — optional overrides for the backend API
  URL and session-cookie domain. Defaults in `app/lib/config.ts` target local
  `.origo.test` development.
- `NEXT_PUBLIC_ORIGO_VERSION` — optional version string shown in the Verso
  sidebar / Flux toolbar. Public, inlined at build time (needs a rebuild to
  change). On Vercel, set to `$VERCEL_GIT_COMMIT_SHA` for a per-deploy value.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
