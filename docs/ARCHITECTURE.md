# Architecture

High-level technical map. Update this only when structure changes (new table, new pipeline stage, new top-level flow) — day-to-day changes belong in `CHANGELOG.md`.

## Request flow

- **Reads**: RSC page (`src/app/**/page.tsx`) → repository module (`src/lib/repository/*`) → Neon Postgres over the HTTP driver.
- **Writes**: server actions (`actions.ts` colocated with the page) → repository → revalidate.
- **Pure logic** (client-safe, no DB imports): `src/lib/recommendations.ts`, `src/lib/nutrition.ts`, `src/lib/diet.ts`, `src/lib/units.ts`, `src/lib/mealValidation.ts`.

## Dual user path

| | Anonymous | Signed in (Logto) |
|---|---|---|
| Plan storage | localStorage, today only | `user_daily_plans` (jsonb per user per date) |
| Preferences / favorites | — | Postgres tables |
| Enabled when | always | Logto env vars configured |

Admin enforcement is always on in production; in dev, `AUTH_ENABLED=true` forces it on, otherwise `/admin` is a local pass-through (`isAdminAuthEnforced` in `src/lib/auth.ts`). `FIRST_ADMIN_EMAIL` bootstraps the first admin.

## Main surfaces

- `/` — today's 5-slot plan (breakfast, snack_am, lunch, snack_pm, dinner), greeting, intention, progress (`HomeClient.tsx`).
- `/select/[slot]` — ranked meal picker; `/meal/[id]` — detail with ingredients + nutrition.
- `/meals`, `/meals/new` — private user meals; `/preferences/*` — diet, favorites, units.
- `/admin/*` — meals/ingredients CRUD, recommendation config, meal-slot validation rules, migrations runner, admins, AI pipeline.
- API: `/api/health` (diagnostics), `/api/admin/upload` (Blob photos), `/api/admin/export-meals`.

## Recommendation engine

`src/lib/recommendations.ts` — pure function over (slot, current plan, meals, config, recent meal ids, diet prefs, pinned meal). Hard filters (slot eligibility, diet/allergen conflicts, no repeats, protein/category variety vs. previous meal) then weighted scoring (carb-base repetition, dairy/bread caps, sweet/savory alternation, cross-day variety). Weights live in the `recommendation_config` DB singleton, tunable at `/admin/config`.

## Nutrition

Ingredients carry per-100g values (USDA-sourced or hand-entered). `src/lib/nutrition.ts` scales by gram/ml quantities; non-scalable units mark the result `approximate`. Per-slot kcal/protein sanity rules live in the `meal_validation_config` singleton (`src/lib/mealValidationConfig.ts`).

## AI generation pipeline (admin)

7 stages in `src/lib/ai/generate.ts` + `src/app/admin/ai/`:
1. propose meal **archetypes** → 2. generate **meal variants** per archetype (staged cards in `generated_meals`) → 3. **extract** unique ingredient names → 4. enrich from **USDA** as ingredient drafts → 5. AI **review** of drafts → 6. **publish** ingredients → 7. **finalize** meals against published ingredients + slot rules into draft catalog meals.

Jobs run in batches of 10 (`ai_generation_jobs`), driven from the admin dashboard with resume/stop. Model + prompts configurable at `/admin/ai/settings` (default `claude-opus-4-8`).

## Database

~15 tables (snapshot: `db/schema.sql`; runtime migrations: `src/lib/repository/migrations.ts`):

- Catalog: `meals`, `ingredients`, `meal_ingredients`, `meal_archetypes`, `generated_meals`
- Per-user: `user_daily_plans`, `user_meal_preferences` (pins), `user_diet_preferences`, `user_favorites`
- Config singletons: `recommendation_config`, `ai_config`, `meal_validation_config` (jsonb, `id='default'`)
- Ops: `admins`, `schema_migrations`, `ai_generation_jobs`, `ai_ingredient_candidates`

**Migration invariant**: every schema change updates `db/migrations/NNN_*.sql`, the `MIGRATIONS` + `VERIFY_CHECKS` registries in `src/lib/repository/migrations.ts` (single idempotent statements — Neon HTTP driver limitation), and `db/schema.sql`. Applied via `/admin/migrations`.

## External services

Neon (Postgres), Logto (auth, optional), Anthropic (AI generation), USDA FoodData Central (nutrition lookup), Vercel Blob (public photo store). All configured via env vars — see `.env.example` and README.
