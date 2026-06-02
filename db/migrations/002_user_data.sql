-- 002_user_data.sql — Per-user multi-day plans and recurring meal preferences.

CREATE TABLE IF NOT EXISTS user_daily_plans (
  user_id     text NOT NULL,
  date        text NOT NULL,          -- YYYY-MM-DD
  slots       jsonb NOT NULL,         -- SlotState[]
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_plans_user ON user_daily_plans(user_id, date DESC);

CREATE TABLE IF NOT EXISTS user_meal_preferences (
  user_id     text NOT NULL,
  slot        text NOT NULL,          -- MealSlotId
  meal_id     text NOT NULL,          -- pinned recurring meal for this slot
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);

INSERT INTO schema_migrations (version) VALUES ('002_user_data') ON CONFLICT DO NOTHING;
