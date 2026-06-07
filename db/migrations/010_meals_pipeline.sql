-- 010_meals_pipeline.sql — meals-first seeding: archetypes, staged meal cards,
-- and per-slot validation rules. New AI job types (archetypes, meal_variants,
-- extract_ingredients, finalize_meals) need no SQL — ai_generation_jobs.type is plain text.

-- Reusable dish archetypes (e.g. "Yogurt bowl") — AI-seeded, admin-editable.
CREATE TABLE IF NOT EXISTS meal_archetypes (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  slot_hint   text,                            -- breakfast|snack|lunch|dinner
  description text NOT NULL DEFAULT '',
  example     text NOT NULL DEFAULT '',
  sort_order  integer NOT NULL DEFAULT 0,
  enabled     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_archetypes_name ON meal_archetypes(lower(name));

-- Staging "meal cards": ingredients held as name+grams jsonb, decoupled from the
-- ingredients FK, until finalized into a real meal + meal_ingredients.
CREATE TABLE IF NOT EXISTS generated_meals (
  id                text PRIMARY KEY,
  archetype_id      text REFERENCES meal_archetypes(id) ON DELETE SET NULL,
  name              text NOT NULL,
  description       text NOT NULL DEFAULT '',
  emoji             text NOT NULL DEFAULT '',
  slot_hint         text,                       -- breakfast|snack|lunch|dinner
  meal_slot_allowed text[] NOT NULL DEFAULT '{}',
  category          text NOT NULL DEFAULT '',
  main_protein      text NOT NULL DEFAULT '',
  protein_group     text NOT NULL DEFAULT 'plant',
  carb_base         text NOT NULL DEFAULT '',
  meal_style        text[] NOT NULL DEFAULT '{}',
  fruit_or_veg      text NOT NULL DEFAULT 'none',
  total_weight_g    numeric,
  ingredients_spec  jsonb NOT NULL DEFAULT '[]', -- [{ name, grams }]
  status            text NOT NULL DEFAULT 'pending', -- pending|finalized|rejected
  reject_reason     text,
  meal_id           text REFERENCES meals(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_generated_meals_status ON generated_meals(status);
CREATE INDEX IF NOT EXISTS idx_generated_meals_archetype ON generated_meals(archetype_id);

-- Per-slot kcal/protein validation rules (single row id='default').
CREATE TABLE IF NOT EXISTS meal_validation_config (
  id          text PRIMARY KEY,
  config      jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text
);

INSERT INTO schema_migrations (version) VALUES ('010_meals_pipeline') ON CONFLICT DO NOTHING;
