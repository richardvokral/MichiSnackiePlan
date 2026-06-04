-- 004_ingredients.sql — ingredient master list + meal_ingredients junction.

CREATE TABLE IF NOT EXISTS ingredients (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  calories    numeric,        -- kcal per 100g
  protein_g   numeric,        -- g per 100g
  carbs_g     numeric,
  fat_g       numeric,
  allergens   text[] NOT NULL DEFAULT '{}',
  diet_type   text,           -- vegan|vegetarian|pescetarian|omnivore
  usda_fdc_id text,           -- FUTURE: USDA FoodData Central id; null for manual entries
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

INSERT INTO schema_migrations (version) VALUES ('004_ingredients') ON CONFLICT DO NOTHING;
