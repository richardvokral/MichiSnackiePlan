-- 001_init.sql — Initial schema for Michi Snackie Plan Phase C
-- This is the same as db/schema.sql, kept here for the future migration runner.

CREATE TABLE IF NOT EXISTS meals (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  description     text NOT NULL,
  meal_slot_allowed text[] NOT NULL,
  category        text NOT NULL,
  main_protein    text NOT NULL,
  protein_group   text NOT NULL,
  carb_base       text NOT NULL,
  meal_style      text[] NOT NULL,
  fruit_or_veg    text NOT NULL,
  tags            text[] NOT NULL DEFAULT '{}',
  emoji           text NOT NULL DEFAULT '',
  image_url       text,
  status          text NOT NULL DEFAULT 'draft',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meals_status ON meals(status);

CREATE TABLE IF NOT EXISTS recommendation_config (
  id              text PRIMARY KEY,
  config          jsonb NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      text
);

CREATE TABLE IF NOT EXISTS admins (
  email           text PRIMARY KEY,
  added_by        text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version         text PRIMARY KEY,
  applied_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version) VALUES ('001_init') ON CONFLICT DO NOTHING;
