-- 007_energy_unit.sql — per-user preferred energy unit (kcal default, or kj).

ALTER TABLE user_diet_preferences ADD COLUMN IF NOT EXISTS energy_unit text;  -- 'kcal' | 'kj' | null (= kcal)

INSERT INTO schema_migrations (version) VALUES ('007_energy_unit') ON CONFLICT DO NOTHING;
