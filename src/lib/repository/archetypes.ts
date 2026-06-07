import 'server-only';
import { getDb } from '@/lib/db/client';

export interface MealArchetype {
  id: string;
  name: string;
  slotHint: string | null;
  description: string;
  example: string;
  sortOrder: number;
  enabled: boolean;
}

export interface ArchetypeInput {
  name: string;
  slotHint?: string | null;
  description?: string;
  example?: string;
  sortOrder?: number;
  enabled?: boolean;
}

interface ArchetypeRow {
  id: string;
  name: string;
  slot_hint: string | null;
  description: string;
  example: string;
  sort_order: number;
  enabled: boolean;
}

function rowToArchetype(row: ArchetypeRow): MealArchetype {
  return {
    id: row.id,
    name: row.name,
    slotHint: row.slot_hint,
    description: row.description,
    example: row.example,
    sortOrder: row.sort_order,
    enabled: row.enabled,
  };
}

function genId(): string {
  return `arch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listArchetypes(enabledOnly = false): Promise<MealArchetype[]> {
  const sql = getDb();
  const rows = enabledOnly
    ? await sql`SELECT * FROM meal_archetypes WHERE enabled = true ORDER BY sort_order, name`
    : await sql`SELECT * FROM meal_archetypes ORDER BY sort_order, name`;
  return (rows as ArchetypeRow[]).map(rowToArchetype);
}

export async function getArchetype(id: string): Promise<MealArchetype | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM meal_archetypes WHERE id = ${id}`;
  if (rows.length === 0) return null;
  return rowToArchetype(rows[0] as ArchetypeRow);
}

export async function countArchetypes(): Promise<number> {
  const sql = getDb();
  const rows = await sql`SELECT count(*)::int AS n FROM meal_archetypes`;
  return (rows[0] as { n: number }).n;
}

export async function getArchetypeNames(): Promise<string[]> {
  const sql = getDb();
  const rows = await sql`SELECT name FROM meal_archetypes ORDER BY name`;
  return (rows as { name: string }[]).map((r) => r.name);
}

export async function createArchetype(input: ArchetypeInput): Promise<MealArchetype> {
  const sql = getDb();
  const id = genId();
  const rows = await sql`
    INSERT INTO meal_archetypes (id, name, slot_hint, description, example, sort_order, enabled)
    VALUES (${id}, ${input.name}, ${input.slotHint ?? null}, ${input.description ?? ''}, ${input.example ?? ''}, ${input.sortOrder ?? 0}, ${input.enabled ?? true})
    RETURNING *
  `;
  return rowToArchetype(rows[0] as ArchetypeRow);
}

// Idempotent seed used by the archetypes batch — skips when lower(name) already exists.
// Returns null if it already existed (so the batch can count duplicates).
export async function upsertArchetypeByName(input: ArchetypeInput): Promise<MealArchetype | null> {
  const sql = getDb();
  const id = genId();
  const rows = await sql`
    INSERT INTO meal_archetypes (id, name, slot_hint, description, example, sort_order, enabled)
    VALUES (${id}, ${input.name}, ${input.slotHint ?? null}, ${input.description ?? ''}, ${input.example ?? ''}, ${input.sortOrder ?? 0}, ${input.enabled ?? true})
    ON CONFLICT (lower(name)) DO NOTHING
    RETURNING *
  `;
  if (rows.length === 0) return null;
  return rowToArchetype(rows[0] as ArchetypeRow);
}

export async function updateArchetype(id: string, input: Partial<ArchetypeInput>): Promise<MealArchetype> {
  const sql = getDb();
  const existing = await sql`SELECT * FROM meal_archetypes WHERE id = ${id}`;
  if (existing.length === 0) throw new Error('Archetype not found');
  const cur = existing[0] as ArchetypeRow;
  const rows = await sql`
    UPDATE meal_archetypes SET
      name = ${input.name ?? cur.name},
      slot_hint = ${input.slotHint !== undefined ? input.slotHint : cur.slot_hint},
      description = ${input.description ?? cur.description},
      example = ${input.example ?? cur.example},
      sort_order = ${input.sortOrder ?? cur.sort_order},
      enabled = ${input.enabled !== undefined ? input.enabled : cur.enabled},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rowToArchetype(rows[0] as ArchetypeRow);
}

export async function deleteArchetype(id: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM meal_archetypes WHERE id = ${id}`;
}
