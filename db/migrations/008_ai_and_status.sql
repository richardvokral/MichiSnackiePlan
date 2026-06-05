-- 008_ai_and_status.sql — ingredient status/source workflow, meal total weight,
-- AI generation jobs + candidate queue, and admin-editable AI settings.

-- Ingredient status workflow (mirrors meals.status) + provenance.
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'; -- manual|ai|usda
CREATE INDEX IF NOT EXISTS idx_ingredients_status ON ingredients(status);

-- Backfill pre-008 ingredients to published so meal builders aren't emptied.
-- New rows insert as 'draft' after this migration runs (it runs exactly once).
UPDATE ingredients SET status = 'published';

-- Total weight enables the "ingredient weights <= 100% of total" rule (foods AI gen).
ALTER TABLE meals ADD COLUMN IF NOT EXISTS total_weight_g numeric;

-- DB-backed batch jobs (no job queue; one batch of <=10 processed per request).
CREATE TABLE IF NOT EXISTS ai_generation_jobs (
  id              text PRIMARY KEY,
  type            text NOT NULL,                  -- ingredient_names | ingredient_usda | meals
  status          text NOT NULL DEFAULT 'pending',-- pending|running|done|error
  target_count    integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  created_count   integer NOT NULL DEFAULT 0,
  error_count     integer NOT NULL DEFAULT 0,
  params          jsonb NOT NULL DEFAULT '{}',
  last_error      text,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_generation_jobs(status);

-- AI-proposed ingredient names awaiting USDA enrichment.
CREATE TABLE IF NOT EXISTS ai_ingredient_candidates (
  id            text PRIMARY KEY,
  job_id        text NOT NULL REFERENCES ai_generation_jobs(id) ON DELETE CASCADE,
  name          text NOT NULL,
  allergens     text[] NOT NULL DEFAULT '{}',
  diet_type     text,
  status        text NOT NULL DEFAULT 'pending',  -- pending|loaded|skipped|error
  ingredient_id text,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_candidates_job ON ai_ingredient_candidates(job_id, status);

-- Admin-editable AI settings (single row id='default'), mirrors recommendation_config.
CREATE TABLE IF NOT EXISTS ai_config (
  id              text PRIMARY KEY,
  config          jsonb NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      text
);

INSERT INTO schema_migrations (version) VALUES ('008_ai_and_status') ON CONFLICT DO NOTHING;
