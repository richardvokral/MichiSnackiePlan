# Changelog

All notable changes to Michi Snackie Plan are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); the project has no releases yet, so entries are grouped by date/phase. Newest first.

## [Unreleased]

- Daily nutrition totals on Home (D2): kcal + protein card summing the day's selected meals, with kcal/kJ support and an "approximate" marker (batch ingredient fetch, `computeDayNutrition`).
- Optional daily targets (D3): `/preferences/goals` with presets (Light & lean / Balanced / Active) or custom kcal + protein; migration `011_user_goals`. Strictly opt-in — no targets means plain totals, no nagging.
- Auto-fill day + week planner (D4): ✨ Auto-fill fills every empty slot via the recommendation engine (variety + diet rules apply); new `/week` 7-day grid with per-day totals, auto-fill/clear, and week navigation.
- Shopping list (D5): `/shopping` aggregates ingredients across planned meals for a date range (per-unit sums), checklist state kept in localStorage per range.
- Bottom navigation now links to real destinations: Home, Week, Shopping, Settings.
- Added in-repo tracking system: agent guide (`AGENTS.md`), `docs/VISION.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, this changelog, and a project-specific README.

## 2026-06-07 — Meals-first AI pipeline

- Pivoted AI generation to a meals-first archetype pipeline (archetypes → meal variants → ingredient extraction → USDA enrichment → AI review → publish → finalize).
- Added meal catalog JSON export and a destructive data-reset panel in admin.

## 2026-06-05 — AI generation engine & UX

- Added ingredient status workflow (draft/published), USDA FoodData Central connection, and the AI generation engine with batched jobs.
- Added draft-ingredient AI review job; constrained AI foods to published ingredients.
- UX: readable native popups, deliberate slot skip, kcal/kJ energy-unit toggle.

## 2026-06-04 — Diet preferences, ingredients & nutrition (M0–M5)

- Dietary preferences (4 diet types, 9 allergens) with meal hide-filtering (M0–M1).
- Ingredient model with per-100g nutrition, meal nutrition panels, private "my meals", favorites, preference import (M2–M5).
- Admin "Run migrations" page with schema verification.
- Fixes: UTC day math, admin button, working calendar picker, Logto base-URL/logout-redirect handling.

## 2026-06-02 — Postgres catalog, admin & auth (Phase C)

- Neon Postgres catalog with admin area and an editable recommendation model.
- Logto authentication, per-user multi-day plans, recurring pinned meals, UX upgrades.
- Hardening: error boundary, `/api/health` diagnostics, DB-backed routes opted out of static prerendering, stable `useSyncExternalStore` snapshot, update-conflict and Blob error fixes.

## 2026-03-21 — Initial app

- Initial Michi Snackie Plan wellness meal app: 5-slot daily plan (breakfast, snacks, lunch, dinner), variety-aware recommendation engine, 20 starter meals, daily intentions.
