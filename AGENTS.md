<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Michi Snackie Plan — Agent Guide

A healthy-meal-suggestion app focused on **easy lean setup**: pick (or auto-get) five sensible meals a day with zero friction. Full product vision: `docs/VISION.md`. Plans and status: `docs/ROADMAP.md`. History of changes: `CHANGELOG.md`. Deeper technical map: `docs/ARCHITECTURE.md`.

## Commands

- `npm run dev` — dev server
- `npm run build` — the quality gate; there is no test suite, so a clean build + lint is required before committing
- `npm run lint`

## Stack

Next.js 16 (App Router, RSC) · React 19 · TypeScript · Tailwind CSS 4 · Neon Postgres (`@neondatabase/serverless`, HTTP driver) · Logto auth (optional) · Anthropic SDK (AI meal generation) · USDA FoodData Central (ingredient nutrition) · Vercel Blob (meal photos).

## Architecture in one minute

- **All DB access goes through `src/lib/repository/`** (one module per table/domain). Pages are RSC that read via repositories; writes happen in server actions (`actions.ts` next to the page).
- **Pure logic modules are client-safe**: `src/lib/recommendations.ts` (variety-aware ranking engine), `src/lib/nutrition.ts`, `src/lib/diet.ts`, `src/lib/units.ts`. Keep them free of DB/server imports.
- **Dual user path**: anonymous users get a today-only plan in localStorage; signed-in (Logto) users get multi-day plans, preferences, and favorites in Postgres.
- **Admin CMS** lives under `src/app/admin/` (meals/ingredients CRUD, recommendation tuning, migrations runner) including the 7-stage AI generation pipeline (`src/lib/ai/generate.ts`, `src/app/admin/ai/`).

## Invariants — do not break these

1. **Migrations live in three places.** Any schema change must update all of: a new file in `db/migrations/`, the `MIGRATIONS` registry + `VERIFY_CHECKS` in `src/lib/repository/migrations.ts` (the runtime source of truth — single idempotent statements only, the Neon HTTP driver can't run multi-statement strings), and the snapshot in `db/schema.sql`. Migrations are applied from `/admin/migrations`, not a CLI.
2. **Config singletons**: `recommendation_config`, `ai_config`, and `meal_validation_config` are jsonb rows with `id='default'` merged over typed defaults in code. Extend the type and the defaults together.
3. **Auth**: admin enforcement is always on in production; `AUTH_ENABLED=true` additionally forces it in dev (`isAdminAuthEnforced` in `src/lib/auth.ts`). Never weaken `requireAdmin` in a way that can reach production.
4. **CLAUDE.md stays exactly `@AGENTS.md`**, and the `nextjs-agent-rules` block at the top of this file must be preserved byte-identical (it is managed externally).

## Tracking convention — keep the docs alive

Every meaningful change (feature, fix, schema change, pivot) must, in the same commit:

- add a bullet under `[Unreleased]` in `CHANGELOG.md` (move bullets under a dated heading when a phase ships);
- update the matching checkbox/status in `docs/ROADMAP.md` — and if the work isn't on the roadmap yet, add it there first;
- touch `docs/ARCHITECTURE.md` only when the change reshapes structure (new table, new pipeline stage, new top-level flow).

New phase planning goes into `docs/ROADMAP.md` (a short phase section with checkboxes), not into commit messages or chat. Keep all of this bullet-level terse — this is a solo hobby project, not a process exercise.
