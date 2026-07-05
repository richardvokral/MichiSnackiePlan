# Roadmap

Status legend: ✅ done · 🔨 in progress · ⏳ planned · 💡 idea / later

Convention: each phase gets a short section with checkboxes. Tick items as they land (same commit as the change, see AGENTS.md → Tracking convention). New ideas go to the **Later / ideas** bucket first.

## Done

| Phase | Summary |
|---|---|
| ✅ A — Initial app | Wellness meal app: 5-slot daily plan, recommendation engine, 20 seed meals |
| ✅ B — Fixes & hardening | Error boundary, `/api/health`, prerender/DB fixes |
| ✅ C — Postgres + admin | Neon catalog, admin area, editable recommendation model |
| ✅ C2 — Auth & multi-day | Logto sign-in, per-user multi-day plans, recurring pins |
| ✅ M0–M1 — Diet preferences | Diet types + allergens with meal hide-filter, migrations runner |
| ✅ M2–M5 — Ingredients & nutrition | Ingredient model, nutrition panels, private meals, favorites, kcal/kJ |
| ✅ AI-1 — Generation engine | Ingredient status workflow, USDA connection, AI generation + review |
| ✅ AI-2 — Meals-first pipeline | Archetype pipeline pivot, meal export + reset |
| ✅ Docs — Tracking system | AGENTS.md guide, vision/roadmap/changelog/architecture docs, real README |

## Phase D — Lean Setup & Weekly Flow (🔨 in progress)

Goal: make the "easy lean setup" promise concrete — day totals, optional targets, one-tap planning. Decision: targets are strictly **optional** — the app never nags about calories; without targets the day just shows plain totals.

- [ ] **D1 — Auth hardening**: close the `AUTH_ENABLED` dev pass-through in `src/lib/auth.ts` (enforce in production / when Logto is configured), add a guard in `src/app/admin/layout.tsx`
- [x] **D2 — Daily nutrition totals on Home**: batch ingredient fetch for the day's meals, `computeDayNutrition`, kcal + protein card on the home screen
- [x] **D3 — Goals quick-setup (optional)**: target kcal / protein in `user_diet_preferences` (migration 011), preset-based `/preferences/goals` page, home card shows progress-vs-target only when set
- [x] **D4 — Auto-fill day + week view**: one-tap fill of empty slots via the existing recommendation engine; 7-day `/week` grid with per-day totals
- [x] **D5 — Shopping list**: aggregate ingredients across planned meals for a date range, checklist with localStorage state
- [ ] **D6 — PWA polish**: web manifest, icons, installable on phone

## Later / ideas

- 💡 Meal photos in the user-facing flow (upload for private meals; `image_url` + Blob already exist)
- 💡 One-click seeding / starter catalog for a fresh database
- 💡 Weekly summary ("how lean was this week?")
- 💡 Portion scaling per user (bigger/smaller appetite)
- 💡 Household mode (two people, shared shopping list)
