-- Michi Snackie Plan — Phase C schema
-- Paste this into the Neon SQL console to create the initial tables.

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
  diet_type       text,
  allergens       text[] NOT NULL DEFAULT '{}',
  allergens_override boolean NOT NULL DEFAULT false,
  owner_user_id   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meals_owner ON meals(owner_user_id);

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

CREATE TABLE IF NOT EXISTS user_daily_plans (
  user_id     text NOT NULL,
  date        text NOT NULL,
  slots       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_plans_user ON user_daily_plans(user_id, date DESC);

CREATE TABLE IF NOT EXISTS user_meal_preferences (
  user_id     text NOT NULL,
  slot        text NOT NULL,
  meal_id     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);

CREATE TABLE IF NOT EXISTS user_diet_preferences (
  user_id    text PRIMARY KEY,
  diet_type  text,
  allergies  text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingredients (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  calories    numeric,
  protein_g   numeric,
  carbs_g     numeric,
  fat_g       numeric,
  allergens   text[] NOT NULL DEFAULT '{}',
  diet_type   text,
  usda_fdc_id text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);

CREATE TABLE IF NOT EXISTS meal_ingredients (
  meal_id       text NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  ingredient_id text NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity      numeric NOT NULL DEFAULT 0,
  unit          text NOT NULL DEFAULT 'g',
  sort_order    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (meal_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal ON meal_ingredients(meal_id);

CREATE TABLE IF NOT EXISTS user_favorites (
  user_id    text NOT NULL,
  meal_id    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, meal_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);

INSERT INTO schema_migrations (version) VALUES ('001_init'), ('002_user_data'), ('003_diet'), ('004_ingredients'), ('005_user_meals'), ('006_favorites') ON CONFLICT DO NOTHING;
