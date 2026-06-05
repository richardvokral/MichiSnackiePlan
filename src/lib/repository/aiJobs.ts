import 'server-only';
import { getDb } from '@/lib/db/client';

export type AiJobType = 'ingredient_names' | 'ingredient_usda' | 'ingredient_review' | 'meals';
export type AiJobStatus = 'pending' | 'running' | 'done' | 'error';

export interface AiJob {
  id: string;
  type: AiJobType;
  status: AiJobStatus;
  targetCount: number;
  processedCount: number;
  createdCount: number;
  errorCount: number;
  params: Record<string, unknown>;
  lastError: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AiJobRow {
  id: string;
  type: string;
  status: string;
  target_count: number;
  processed_count: number;
  created_count: number;
  error_count: number;
  params: Record<string, unknown> | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function rowToJob(row: AiJobRow): AiJob {
  return {
    id: row.id,
    type: row.type as AiJobType,
    status: row.status as AiJobStatus,
    targetCount: row.target_count,
    processedCount: row.processed_count,
    createdCount: row.created_count,
    errorCount: row.error_count,
    params: row.params ?? {},
    lastError: row.last_error,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createAiJob(
  type: AiJobType,
  targetCount: number,
  params: object = {},
  createdBy?: string,
): Promise<AiJob> {
  const sql = getDb();
  const id = genId('aijob');
  const rows = await sql`
    INSERT INTO ai_generation_jobs (id, type, status, target_count, params, created_by)
    VALUES (${id}, ${type}, 'pending', ${targetCount}, ${JSON.stringify(params)}::jsonb, ${createdBy ?? null})
    RETURNING *
  `;
  return rowToJob(rows[0] as AiJobRow);
}

export async function getAiJob(id: string): Promise<AiJob | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM ai_generation_jobs WHERE id = ${id}`;
  if (rows.length === 0) return null;
  return rowToJob(rows[0] as AiJobRow);
}

export async function listAiJobs(limit = 20): Promise<AiJob[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM ai_generation_jobs ORDER BY created_at DESC LIMIT ${limit}`;
  return (rows as AiJobRow[]).map(rowToJob);
}

export async function updateAiJobProgress(
  id: string,
  patch: Partial<Pick<AiJob, 'status' | 'processedCount' | 'createdCount' | 'errorCount' | 'lastError'>>,
): Promise<AiJob> {
  const sql = getDb();
  // COALESCE keeps existing values for any field not in the patch.
  const rows = await sql`
    UPDATE ai_generation_jobs SET
      status = COALESCE(${patch.status ?? null}, status),
      processed_count = COALESCE(${patch.processedCount ?? null}, processed_count),
      created_count = COALESCE(${patch.createdCount ?? null}, created_count),
      error_count = COALESCE(${patch.errorCount ?? null}, error_count),
      last_error = ${patch.lastError !== undefined ? patch.lastError : null},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) throw new Error('Job not found');
  return rowToJob(rows[0] as AiJobRow);
}

// ---- Ingredient candidate queue (for ingredient_usda jobs) ----

export interface IngredientCandidate {
  id: string;
  name: string;
  allergens: string[];
  dietType: string | null;
}

export async function addIngredientCandidates(
  jobId: string,
  items: { name: string; allergens: string[]; dietType: string | null }[],
): Promise<void> {
  const sql = getDb();
  for (const item of items) {
    const id = genId('aic');
    await sql`
      INSERT INTO ai_ingredient_candidates (id, job_id, name, allergens, diet_type)
      VALUES (${id}, ${jobId}, ${item.name}, ${item.allergens}, ${item.dietType})
    `;
  }
}

export async function countPendingCandidates(jobId: string): Promise<number> {
  const sql = getDb();
  const rows = await sql`SELECT count(*)::int AS n FROM ai_ingredient_candidates WHERE job_id = ${jobId} AND status = 'pending'`;
  return (rows[0] as { n: number }).n;
}

// The USDA-enrichment stage drains a GLOBAL pending queue (candidates from any
// names job), so a single "Load from USDA" job can resume across the rate limit.
export async function countAllPendingCandidates(): Promise<number> {
  const sql = getDb();
  const rows = await sql`SELECT count(*)::int AS n FROM ai_ingredient_candidates WHERE status = 'pending'`;
  return (rows[0] as { n: number }).n;
}

export async function getAnyPendingCandidates(limit: number): Promise<IngredientCandidate[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, name, allergens, diet_type FROM ai_ingredient_candidates
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT ${limit}
  `;
  return (rows as { id: string; name: string; allergens: string[] | null; diet_type: string | null }[]).map((r) => ({
    id: r.id,
    name: r.name,
    allergens: r.allergens ?? [],
    dietType: r.diet_type,
  }));
}

export async function getJobCandidateNames(jobId: string): Promise<string[]> {
  const sql = getDb();
  const rows = await sql`SELECT name FROM ai_ingredient_candidates WHERE job_id = ${jobId}`;
  return (rows as { name: string }[]).map((r) => r.name);
}

export async function getPendingCandidates(jobId: string, limit: number): Promise<IngredientCandidate[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, name, allergens, diet_type FROM ai_ingredient_candidates
    WHERE job_id = ${jobId} AND status = 'pending'
    ORDER BY created_at
    LIMIT ${limit}
  `;
  return (rows as { id: string; name: string; allergens: string[] | null; diet_type: string | null }[]).map((r) => ({
    id: r.id,
    name: r.name,
    allergens: r.allergens ?? [],
    dietType: r.diet_type,
  }));
}

export async function markCandidate(
  id: string,
  status: 'loaded' | 'skipped' | 'error',
  ingredientId?: string,
  error?: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE ai_ingredient_candidates SET
      status = ${status},
      ingredient_id = ${ingredientId ?? null},
      error = ${error ?? null}
    WHERE id = ${id}
  `;
}
