-- 003_diet.sql — meal allergen/diet flags (manual override) + per-user diet preferences.

ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS diet_type          text,                         -- omnivore|vegetarian|pescetarian|vegan|null
  ADD COLUMN IF NOT EXISTS allergens          text[] NOT NULL DEFAULT '{}', -- manual allergen tags
  ADD COLUMN IF NOT EXISTS allergens_override boolean NOT NULL DEFAULT false; -- when true, allergens[] is authoritative

CREATE TABLE IF NOT EXISTS user_diet_preferences (
  user_id    text PRIMARY KEY,
  diet_type  text,                          -- omnivore|vegetarian|pescetarian|vegan (null = no restriction)
  allergies  text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version) VALUES ('003_diet') ON CONFLICT DO NOTHING;
