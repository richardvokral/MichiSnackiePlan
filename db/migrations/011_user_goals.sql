-- Optional daily targets (kcal + protein). Both nullable: no target means the
-- app just shows plain day totals — goals are opt-in by design.
ALTER TABLE user_diet_preferences ADD COLUMN IF NOT EXISTS target_kcal integer;
ALTER TABLE user_diet_preferences ADD COLUMN IF NOT EXISTS target_protein_g integer;
