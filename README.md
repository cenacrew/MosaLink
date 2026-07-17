# MosaLink — dashboard bento (cenacrew.com/qrcode)

**MosaLink** (mosaïque + link) is the public **bento dashboard** served behind
the printed QR codes at **cenacrew.com/qrcode**, plus the Android admin app that
drives it. Site content is in French; code, identifiers and commits are in
English.

> The public URL `cenacrew.com/qrcode` must stay up permanently — printed QR
> codes point at it.

## Multi-zone architecture

MosaLink is the **`MosaLink` zone** of a Next.js **multi-zone** setup. The hub
`cenacrew.com` (repo `cenacrew/Portfolio`) reverse-proxies `/qrcode`,
`/adminqrcode`, `/api/*` and the zone's assets to the technical sub-domain
`mosalink.cenacrew.com`. **Public URLs never change** — visitors only ever see
`cenacrew.com/...`; "MosaLink" is the product/repo name, not a URL segment.

```
Hub  cenacrew/Portfolio            →   Zone  cenacrew/MosaLink (this repo)
Vercel project « portfolio »           Vercel project « mosalink »
cenacrew.com                           mosalink.cenacrew.com (technical, noindex)
├─ / (hub landing)                     ├─ /qrcode, /qrcode/[slug]
└─ rewrites → this zone:               ├─ /adminqrcode (+/test), /qa-gallery
   /qrcode, /adminqrcode, /api/*,      ├─ /api/* (all routes)
   /qa-gallery, /mosalink-zone/*       └─ vercel.json (cron daily-digest)
```

The zone stays fully functional in **direct access** too (`pnpm dev`,
`next start`, CI Playwright — no proxy in front). This is enforced by
`apps/web/next.config.ts`:

- `assetPrefix: "/mosalink-zone"` + a `beforeFiles` rewrite
  `/mosalink-zone/_next/:path*` → `/_next/:path*` so the zone's `_next/*` assets
  never collide with the hub's across the proxy;
- `experimental.serverActions.allowedOrigins` includes the hub origins so admin
  Server Actions pass the CSRF check behind the proxy;
- `/` permanently redirects (308) to `https://cenacrew.com`;
- `X-Robots-Tag: noindex` is sent on the `mosalink.cenacrew.com` host (the
  content is indexable only via `cenacrew.com`; `metadataBase` stays
  `https://cenacrew.com`).

Adding a future `cenacrew.com/<project>` follows the same recipe on the hub
side: new repo + Vercel project + `xxx.cenacrew.com` sub-domain + a block of
rewrites.

## Stack

- **Web** (`apps/web`): Next.js 16 (App Router, React 19, TypeScript), deployed
  on Vercel (root directory `apps/web`). Hosts the public dashboard (`/qrcode`),
  the admin (`/adminqrcode`), the QA console/gallery and every API route.
- **Mobile** (`apps/mobile`): Expo SDK 57 / React Native admin app "QRCodeAdmin"
  (expo-router, TypeScript). Dev via Expo Go; standalone APK via EAS (preview
  profile). Base web origin is configurable via `EXPO_PUBLIC_BASE_URL` (defaults
  to `https://cenacrew.com`). See `apps/mobile/README.md`.
- **Shared** (`packages/shared`): widget model, Zod config schemas, grid
  constants and the typed Supabase client/queries — one source of truth for web
  and mobile, no duplicated business logic. (Package id `@portfolio/shared` is
  kept from history.)
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime). Schema, RLS and
  seed live in `supabase/migrations` (`0001` → `0015`); read-only RLS checks in
  `supabase/checks/rls_audit.sql`.
- **No-key APIs**: Open-Meteo (weather), Leaflet + OpenStreetMap (maps),
  Letterboxd RSS. Spotify and Riot (LoL) use server-only credentials.

## Monorepo layout

```
/
├─ apps/
│  ├─ web/         # Next.js 16 zone — /qrcode + /adminqrcode + /qa-gallery + API
│  └─ mobile/      # Expo / React Native admin app (QRCodeAdmin)
├─ packages/
│  └─ shared/      # widget types, Zod schemas, grid constants, Supabase client
├─ supabase/
│  ├─ migrations/  # 0001…0015 (schema, RLS, storage, seed, scores, reactions…)
│  └─ checks/      # rls_audit.sql (read-only verification)
├─ scripts/        # widget hashes, orphan-media purge…
├─ .github/workflows/ci.yml
├─ pnpm-workspace.yaml
└─ package.json
```

## Development

Requires Node 24 and pnpm (via corepack).

```bash
pnpm install          # from the repo root — installs the whole workspace
pnpm dev              # apps/web in dev at http://localhost:3000 (open /qrcode)
pnpm build            # production build of apps/web
pnpm start            # serve the production build
pnpm lint             # lint apps/web
pnpm test             # unit tests (packages/shared, vitest)
pnpm test:e2e         # Playwright smoke + QA screenshots (production build)
```

The web app runs **without any env vars**: `/qrcode` falls back to the local
config in `apps/web/src/config/widgets.config.ts` and `/adminqrcode` shows a
"not configured" screen. Fill `apps/web/.env.local` (see `apps/web/.env.example`)
to enable the database, admin editing, live guestbook/poll/visits, Spotify and
the LoL widget. `/` redirects to the hub even locally.

Mobile app: see `apps/mobile/README.md` (Expo Go dev + EAS preview APK build).

## Environment variables

- `apps/web/.env.example` — Supabase (public URL + anon key, server-only
  service_role), poll hash salt, Spotify, Riot, `CRON_SECRET`, `GITHUB_TOKEN` +
  `GITHUB_REPO` (QA issues target `cenacrew/MosaLink`).
- `apps/mobile/.env.example` — public Supabase URL + anon key, and optional
  `EXPO_PUBLIC_BASE_URL`. The service_role key never ships in the app; all
  mobile writes go through the authenticated Supabase session, enforced by RLS.
