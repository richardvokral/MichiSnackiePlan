-- 006_favorites.sql — per-user favorite meals.

CREATE TABLE IF NOT EXISTS user_favorites (
  user_id    text NOT NULL,
  meal_id    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, meal_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);

INSERT INTO schema_migrations (version) VALUES ('006_favorites') ON CONFLICT DO NOTHING;
