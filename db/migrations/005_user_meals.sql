-- 005_user_meals.sql — private, user-created meals.

ALTER TABLE meals ADD COLUMN IF NOT EXISTS owner_user_id text;  -- null = public catalog; set = private to that user

CREATE INDEX IF NOT EXISTS idx_meals_owner ON meals(owner_user_id);

INSERT INTO schema_migrations (version) VALUES ('005_user_meals') ON CONFLICT DO NOTHING;
