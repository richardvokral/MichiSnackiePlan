# Michi Snackie Plan 🥗

A healthy-meal-suggestion app focused on **easy lean setup**: five sensible meals a day (breakfast, two snacks, lunch, dinner) suggested from a curated catalog by a variety-aware recommendation engine. Open the app, accept or swap today's plan, eat well.

- **Vision & principles**: [docs/VISION.md](docs/VISION.md)
- **Roadmap & status**: [docs/ROADMAP.md](docs/ROADMAP.md)
- **Change history**: [CHANGELOG.md](CHANGELOG.md)
- **Technical map**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Agent/contributor guide**: [AGENTS.md](AGENTS.md)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Neon Postgres · Logto auth (optional) · Anthropic API (AI meal generation) · USDA FoodData Central · Vercel Blob.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in at least DATABASE_URL
npm run dev
```

Then open http://localhost:3000, go to `/admin/migrations` and run the migrations (the app manages its own schema — there is no CLI migration step). Optionally seed the 20 starter meals with `scripts/import-initial-meals.sql` in the Neon console.

Without Logto configured the app runs fully anonymous (today-only plan in localStorage). In local development `/admin` is a no-sign-in pass-through while `AUTH_ENABLED=false`; production always enforces admin sign-in regardless of the flag.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Neon Postgres connection string |
| `AUTH_ENABLED` | prod | `true` in production so `/admin` requires a Logto admin |
| `FIRST_ADMIN_EMAIL` | prod | Bootstrap admin (always has admin access) |
| `LOGTO_ENDPOINT` / `LOGTO_APP_ID` / `LOGTO_APP_SECRET` / `LOGTO_BASE_URL` / `LOGTO_COOKIE_SECRET` | optional | User sign-in → multi-day plans, preferences, favorites |
| `ANTHROPIC_API_KEY` | optional | AI meal/ingredient generation (`/admin/ai`) |
| `USDA_API_KEY` | optional | Ingredient nutrition lookup ([free key](https://fdc.nal.usda.gov/api-key-signup)) |
| `BLOB_READ_WRITE_TOKEN` | optional | Vercel Blob (public store) for meal photos |

See `.env.example` for details and Logto redirect-URI setup.

## Development

- `npm run dev` — dev server
- `npm run build` && `npm run lint` — the quality gate (no test suite yet)

Deployed on Vercel; database and Blob via the Vercel marketplace integrations.
