import 'server-only';
import { getDb } from '@/lib/db/client';
import {
  MigrationReport,
  MigrationStatusRow,
  MigrationStepResult,
  VerifyCheckResult,
} from '@/lib/migrationTypes';

// Each migration is a list of individual, idempotent SQL statements. The Neon
// HTTP driver runs one statement per request, so we keep statements separate
// (no fragile splitting) and run a whole migration as a single atomic
// transaction via sql.transaction(). The runner appends the schema_migrations
// bookkeeping insert, so the version is only recorded if every statement commits.
//
// This registry is the RUNTIME source of truth (bundled with the app, so it works
// in serverless deploys where the db/migrations/*.sql files are not available).
// Keep it in sync with db/migrations/*.sql and db/schema.sql.
interface Migration {
  version: string;
  statements: string[];
}

const MIGRATIONS: Migration[] = [
  {
    version: '001_init',
    statements: [
      `CREATE TABLE IF NOT EXISTS meals (
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
      )`,
      `CREATE INDEX IF NOT EXISTS idx_meals_status ON meals(status)`,
      `CREATE TABLE IF NOT EXISTS recommendation_config (
        id              text PRIMARY KEY,
        config          jsonb NOT NULL,
        updated_at      timestamptz NOT NULL DEFAULT now(),
        updated_by      text
      )`,
      `CREATE TABLE IF NOT EXISTS admins (
        email           text PRIMARY KEY,
        added_by        text,
        created_at      timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version         text PRIMARY KEY,
        applied_at      timestamptz NOT NULL DEFAULT now()
      )`,
    ],
  },
  {
    version: '002_user_data',
    statements: [
      `CREATE TABLE IF NOT EXISTS user_daily_plans (
        user_id     text NOT NULL,
        date        text NOT NULL,
        slots       jsonb NOT NULL,
        updated_at  timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, date)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_daily_plans_user ON user_daily_plans(user_id, date DESC)`,
      `CREATE TABLE IF NOT EXISTS user_meal_preferences (
        user_id     text NOT NULL,
        slot        text NOT NULL,
        meal_id     text NOT NULL,
        created_at  timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, slot)
      )`,
    ],
  },
  {
    version: '003_diet',
    statements: [
      `ALTER TABLE meals ADD COLUMN IF NOT EXISTS diet_type text`,
      `ALTER TABLE meals ADD COLUMN IF NOT EXISTS allergens text[] NOT NULL DEFAULT '{}'`,
      `ALTER TABLE meals ADD COLUMN IF NOT EXISTS allergens_override boolean NOT NULL DEFAULT false`,
      `CREATE TABLE IF NOT EXISTS user_diet_preferences (
        user_id    text PRIMARY KEY,
        diet_type  text,
        allergies  text[] NOT NULL DEFAULT '{}',
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
    ],
  },
  {
    version: '004_ingredients',
    statements: [
      `CREATE TABLE IF NOT EXISTS ingredients (
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
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name)`,
      `CREATE TABLE IF NOT EXISTS meal_ingredients (
        meal_id       text NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
        ingredient_id text NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
        quantity      numeric NOT NULL DEFAULT 0,
        unit          text NOT NULL DEFAULT 'g',
        sort_order    integer NOT NULL DEFAULT 0,
        PRIMARY KEY (meal_id, ingredient_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal ON meal_ingredients(meal_id)`,
    ],
  },
  {
    version: '005_user_meals',
    statements: [
      `ALTER TABLE meals ADD COLUMN IF NOT EXISTS owner_user_id text`,
      `CREATE INDEX IF NOT EXISTS idx_meals_owner ON meals(owner_user_id)`,
    ],
  },
  {
    version: '006_favorites',
    statements: [
      `CREATE TABLE IF NOT EXISTS user_favorites (
        user_id    text NOT NULL,
        meal_id    text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, meal_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id)`,
    ],
  },
  {
    version: '007_energy_unit',
    statements: [
      `ALTER TABLE user_diet_preferences ADD COLUMN IF NOT EXISTS energy_unit text`,
    ],
  },
  {
    version: '008_ai_and_status',
    statements: [
      // Ingredient status workflow (mirrors meals.status) + provenance.
      `ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'`,
      `ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'`,
      `CREATE INDEX IF NOT EXISTS idx_ingredients_status ON ingredients(status)`,
      // Backfill: pre-008 ingredients were created before the status gate, so keep
      // them visible to meal builders. New rows insert as 'draft' after this runs.
      // Safe because migrations run exactly once (guarded by schema_migrations).
      `UPDATE ingredients SET status = 'published'`,
      // Total weight enables the "ingredients <= 100% of weight" rule (foods AI gen).
      `ALTER TABLE meals ADD COLUMN IF NOT EXISTS total_weight_g numeric`,
      // DB-backed batch jobs (no job queue exists; processed one batch per request).
      `CREATE TABLE IF NOT EXISTS ai_generation_jobs (
        id              text PRIMARY KEY,
        type            text NOT NULL,
        status          text NOT NULL DEFAULT 'pending',
        target_count    integer NOT NULL DEFAULT 0,
        processed_count integer NOT NULL DEFAULT 0,
        created_count   integer NOT NULL DEFAULT 0,
        error_count     integer NOT NULL DEFAULT 0,
        params          jsonb NOT NULL DEFAULT '{}',
        last_error      text,
        created_by      text,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_generation_jobs(status)`,
      // Work queue of AI-proposed ingredient names awaiting USDA enrichment.
      `CREATE TABLE IF NOT EXISTS ai_ingredient_candidates (
        id            text PRIMARY KEY,
        job_id        text NOT NULL REFERENCES ai_generation_jobs(id) ON DELETE CASCADE,
        name          text NOT NULL,
        allergens     text[] NOT NULL DEFAULT '{}',
        diet_type     text,
        status        text NOT NULL DEFAULT 'pending',
        ingredient_id text,
        error         text,
        created_at    timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ai_candidates_job ON ai_ingredient_candidates(job_id, status)`,
      // Admin-editable AI settings (single row id='default'), mirrors recommendation_config.
      `CREATE TABLE IF NOT EXISTS ai_config (
        id              text PRIMARY KEY,
        config          jsonb NOT NULL,
        updated_at      timestamptz NOT NULL DEFAULT now(),
        updated_by      text
      )`,
    ],
  },
  {
    version: '009_ingredient_review',
    statements: [
      // AI review notes for draft ingredients (the "Review drafts" job). NULL means
      // not yet reviewed, which is also how the review queue finds pending drafts.
      `ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS review_note text`,
    ],
  },
];

// Post-run health probes. Each returns a single row with an `ok` boolean so we can
// confirm the database actually has the expected objects (not just that the
// bookkeeping table says so).
const VERIFY_CHECKS: { label: string; sql: string }[] = [
  { label: 'meals table', sql: `SELECT (to_regclass('public.meals') IS NOT NULL) AS ok` },
  { label: 'meals.diet_type column', sql: columnExists('meals', 'diet_type') },
  { label: 'meals.allergens column', sql: columnExists('meals', 'allergens') },
  { label: 'meals.allergens_override column', sql: columnExists('meals', 'allergens_override') },
  { label: 'meals.owner_user_id column', sql: columnExists('meals', 'owner_user_id') },
  { label: 'recommendation_config table', sql: `SELECT (to_regclass('public.recommendation_config') IS NOT NULL) AS ok` },
  { label: 'admins table', sql: `SELECT (to_regclass('public.admins') IS NOT NULL) AS ok` },
  { label: 'schema_migrations table', sql: `SELECT (to_regclass('public.schema_migrations') IS NOT NULL) AS ok` },
  { label: 'user_daily_plans table', sql: `SELECT (to_regclass('public.user_daily_plans') IS NOT NULL) AS ok` },
  { label: 'user_meal_preferences table', sql: `SELECT (to_regclass('public.user_meal_preferences') IS NOT NULL) AS ok` },
  { label: 'user_diet_preferences table', sql: `SELECT (to_regclass('public.user_diet_preferences') IS NOT NULL) AS ok` },
  { label: 'user_diet_preferences.energy_unit column', sql: columnExists('user_diet_preferences', 'energy_unit') },
  { label: 'ingredients table', sql: `SELECT (to_regclass('public.ingredients') IS NOT NULL) AS ok` },
  { label: 'ingredients.status column', sql: columnExists('ingredients', 'status') },
  { label: 'ingredients.source column', sql: columnExists('ingredients', 'source') },
  { label: 'ingredients.review_note column', sql: columnExists('ingredients', 'review_note') },
  { label: 'meal_ingredients table', sql: `SELECT (to_regclass('public.meal_ingredients') IS NOT NULL) AS ok` },
  { label: 'meals.total_weight_g column', sql: columnExists('meals', 'total_weight_g') },
  { label: 'user_favorites table', sql: `SELECT (to_regclass('public.user_favorites') IS NOT NULL) AS ok` },
  { label: 'ai_generation_jobs table', sql: `SELECT (to_regclass('public.ai_generation_jobs') IS NOT NULL) AS ok` },
  { label: 'ai_ingredient_candidates table', sql: `SELECT (to_regclass('public.ai_ingredient_candidates') IS NOT NULL) AS ok` },
  { label: 'ai_config table', sql: `SELECT (to_regclass('public.ai_config') IS NOT NULL) AS ok` },
];

function columnExists(table: string, column: string): string {
  return `SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '${table}' AND column_name = '${column}'
  ) AS ok`;
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// Read-only status of every known migration, for the admin page's initial render.
// Tolerates a database that has never been migrated (schema_migrations missing) or
// an unconfigured DATABASE_URL — both surface as "all pending" rather than throwing.
export async function getMigrationStatus(): Promise<MigrationStatusRow[]> {
  let sql: ReturnType<typeof getDb>;
  try {
    sql = getDb();
  } catch {
    return MIGRATIONS.map((m) => ({ version: m.version, applied: false, appliedAt: null }));
  }

  const appliedAt = new Map<string, string | null>();
  try {
    const rows = (await sql.query('SELECT version, applied_at FROM schema_migrations')) as {
      version: string;
      applied_at: string | null;
    }[];
    for (const r of rows) {
      appliedAt.set(r.version, r.applied_at ? new Date(r.applied_at).toISOString() : null);
    }
  } catch {
    // schema_migrations doesn't exist yet → nothing applied.
  }

  return MIGRATIONS.map((m) => ({
    version: m.version,
    applied: appliedAt.has(m.version),
    appliedAt: appliedAt.get(m.version) ?? null,
  }));
}

async function runVerifyChecks(sql: ReturnType<typeof getDb>): Promise<VerifyCheckResult[]> {
  const results: VerifyCheckResult[] = [];
  for (const check of VERIFY_CHECKS) {
    try {
      const rows = (await sql.query(check.sql)) as { ok: boolean }[];
      results.push({ label: check.label, ok: Boolean(rows[0]?.ok) });
    } catch (e) {
      results.push({ label: check.label, ok: false, detail: errMessage(e) });
    }
  }
  return results;
}

// Applies any pending migrations (in order, each atomically) and then verifies the
// resulting schema. Safe to run repeatedly: already-applied migrations are skipped
// and every statement is idempotent. Stops at the first failing migration so a
// later migration never runs against a half-built schema.
export async function runAndVerifyMigrations(): Promise<MigrationReport> {
  let sql: ReturnType<typeof getDb>;
  try {
    sql = getDb();
  } catch (e) {
    return {
      steps: [],
      checks: [],
      ok: false,
      message: `Database is not configured: ${errMessage(e)}`,
    };
  }

  const steps: MigrationStepResult[] = [];

  try {
    await sql.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
    );
  } catch (e) {
    return { steps, checks: [], ok: false, message: `Could not initialize schema_migrations: ${errMessage(e)}` };
  }

  const applied = new Set<string>();
  try {
    const rows = (await sql.query('SELECT version FROM schema_migrations')) as { version: string }[];
    for (const r of rows) applied.add(r.version);
  } catch (e) {
    return { steps, checks: [], ok: false, message: `Could not read schema_migrations: ${errMessage(e)}` };
  }

  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) {
      steps.push({ version: m.version, status: 'skipped' });
      continue;
    }
    try {
      const queries = [
        ...m.statements.map((s) => sql.query(s)),
        sql.query('INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING', [m.version]),
      ];
      await sql.transaction(queries);
      steps.push({ version: m.version, status: 'applied', statementsRun: m.statements.length });
    } catch (e) {
      steps.push({ version: m.version, status: 'failed', error: errMessage(e) });
      break; // don't run later migrations against a half-applied schema
    }
  }

  const checks = await runVerifyChecks(sql);

  const failedStep = steps.find((s) => s.status === 'failed');
  const failedChecks = checks.filter((c) => !c.ok);
  const ok = !failedStep && failedChecks.length === 0;

  const appliedCount = steps.filter((s) => s.status === 'applied').length;
  const skippedCount = steps.filter((s) => s.status === 'skipped').length;

  let message: string;
  if (failedStep) {
    message = `Migration ${failedStep.version} failed: ${failedStep.error}`;
  } else if (failedChecks.length > 0) {
    message = `Schema verification failed for: ${failedChecks.map((c) => c.label).join(', ')}`;
  } else {
    message = `All good — ${appliedCount} applied, ${skippedCount} already up to date, ${checks.length} checks passed.`;
  }

  return { steps, checks, ok, message };
}
