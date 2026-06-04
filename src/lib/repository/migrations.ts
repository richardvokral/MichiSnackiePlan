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
];

// Post-run health probes. Each returns a single row with an `ok` boolean so we can
// confirm the database actually has the expected objects (not just that the
// bookkeeping table says so).
const VERIFY_CHECKS: { label: string; sql: string }[] = [
  { label: 'meals table', sql: `SELECT (to_regclass('public.meals') IS NOT NULL) AS ok` },
  { label: 'meals.diet_type column', sql: columnExists('meals', 'diet_type') },
  { label: 'meals.allergens column', sql: columnExists('meals', 'allergens') },
  { label: 'meals.allergens_override column', sql: columnExists('meals', 'allergens_override') },
  { label: 'recommendation_config table', sql: `SELECT (to_regclass('public.recommendation_config') IS NOT NULL) AS ok` },
  { label: 'admins table', sql: `SELECT (to_regclass('public.admins') IS NOT NULL) AS ok` },
  { label: 'schema_migrations table', sql: `SELECT (to_regclass('public.schema_migrations') IS NOT NULL) AS ok` },
  { label: 'user_daily_plans table', sql: `SELECT (to_regclass('public.user_daily_plans') IS NOT NULL) AS ok` },
  { label: 'user_meal_preferences table', sql: `SELECT (to_regclass('public.user_meal_preferences') IS NOT NULL) AS ok` },
  { label: 'user_diet_preferences table', sql: `SELECT (to_regclass('public.user_diet_preferences') IS NOT NULL) AS ok` },
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
