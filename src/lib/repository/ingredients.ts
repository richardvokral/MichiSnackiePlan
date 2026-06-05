import 'server-only';
import { getDb } from '@/lib/db/client';
import { Ingredient, IngredientStatus } from '@/lib/types';
import { DietType, DIET_TYPES } from '@/lib/diet';
import { z } from 'zod/v4';

const dietTypeSchema = z.enum(DIET_TYPES);
const ingredientStatusSchema = z.enum(['draft', 'published', 'inactive']);
const ingredientSourceSchema = z.enum(['manual', 'ai', 'usda']);

export const ingredientInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(200),
  calories: z.number().nonnegative().nullable().default(null),
  proteinG: z.number().nonnegative().nullable().default(null),
  carbsG: z.number().nonnegative().nullable().default(null),
  fatG: z.number().nonnegative().nullable().default(null),
  allergens: z.array(z.string().max(50)).default([]),
  dietType: dietTypeSchema.nullable().default(null),
  usdaFdcId: z.string().max(50).nullable().default(null),
  status: ingredientStatusSchema.default('draft'),
  source: ingredientSourceSchema.default('manual'),
});

export type IngredientInput = z.infer<typeof ingredientInputSchema>;

interface IngredientRow {
  id: string;
  name: string;
  calories: string | null; // numeric comes back as string from the driver
  protein_g: string | null;
  carbs_g: string | null;
  fat_g: string | null;
  allergens: string[] | null;
  diet_type: string | null;
  usda_fdc_id: string | null;
  status: string | null;
  source: string | null;
  review_note: string | null;
}

function num(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function rowToIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    name: row.name,
    calories: num(row.calories),
    proteinG: num(row.protein_g),
    carbsG: num(row.carbs_g),
    fatG: num(row.fat_g),
    allergens: row.allergens ?? [],
    dietType: (row.diet_type as DietType | null) ?? null,
    usdaFdcId: row.usda_fdc_id,
    status: (row.status as IngredientStatus | null) ?? 'published',
    source: (row.source as Ingredient['source'] | null) ?? 'manual',
    reviewNote: row.review_note,
  };
}

// Admin listing — optionally filtered by status. Shows every ingredient (incl. drafts)
// so admins can review AI/USDA output. Meal builders use getPublishedIngredients().
export async function listIngredients(statusFilter?: IngredientStatus): Promise<Ingredient[]> {
  const sql = getDb();
  if (statusFilter) {
    const rows = await sql`SELECT * FROM ingredients WHERE status = ${statusFilter} ORDER BY name`;
    return (rows as IngredientRow[]).map(rowToIngredient);
  }
  const rows = await sql`SELECT * FROM ingredients ORDER BY name`;
  return (rows as IngredientRow[]).map(rowToIngredient);
}

// Only published ingredients are attachable to meals and count toward meal nutrition.
export async function getPublishedIngredients(): Promise<Ingredient[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM ingredients WHERE status = 'published' ORDER BY name`;
  return (rows as IngredientRow[]).map(rowToIngredient);
}

export async function getIngredientById(id: string): Promise<Ingredient | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM ingredients WHERE id = ${id}`;
  if (rows.length === 0) return null;
  return rowToIngredient(rows[0] as IngredientRow);
}

// Case-insensitive name lookup — used by the AI pipeline to avoid duplicates.
export async function getIngredientByName(name: string): Promise<Ingredient | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM ingredients WHERE lower(name) = lower(${name}) LIMIT 1`;
  if (rows.length === 0) return null;
  return rowToIngredient(rows[0] as IngredientRow);
}

export async function getIngredientByUsdaId(fdcId: string): Promise<Ingredient | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM ingredients WHERE usda_fdc_id = ${fdcId} LIMIT 1`;
  if (rows.length === 0) return null;
  return rowToIngredient(rows[0] as IngredientRow);
}

export async function createIngredient(input: IngredientInput): Promise<Ingredient> {
  const data = ingredientInputSchema.parse(input);
  const sql = getDb();
  const id = data.id || `ing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rows = await sql`
    INSERT INTO ingredients (id, name, calories, protein_g, carbs_g, fat_g, allergens, diet_type, usda_fdc_id, status, source)
    VALUES (${id}, ${data.name}, ${data.calories}, ${data.proteinG}, ${data.carbsG}, ${data.fatG}, ${data.allergens}, ${data.dietType}, ${data.usdaFdcId}, ${data.status}, ${data.source})
    RETURNING *
  `;
  return rowToIngredient(rows[0] as IngredientRow);
}

// Create an ingredient forced to 'draft' (AI/USDA pipeline). Caller sets source.
export async function createIngredientDraft(input: Omit<IngredientInput, 'status'>): Promise<Ingredient> {
  return createIngredient({ ...input, status: 'draft' });
}

export async function updateIngredient(id: string, input: IngredientInput): Promise<Ingredient> {
  const data = ingredientInputSchema.parse(input);
  const sql = getDb();
  const rows = await sql`
    UPDATE ingredients SET
      name = ${data.name},
      calories = ${data.calories},
      protein_g = ${data.proteinG},
      carbs_g = ${data.carbsG},
      fat_g = ${data.fatG},
      allergens = ${data.allergens},
      diet_type = ${data.dietType},
      usda_fdc_id = ${data.usdaFdcId},
      status = ${data.status},
      source = ${data.source},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) throw new Error('Ingredient not found');
  return rowToIngredient(rows[0] as IngredientRow);
}

// ---- Draft-ingredient review queue (the "Review drafts" AI job) ----
// An unreviewed draft has review_note IS NULL. The job drains this queue 10 at a
// time, writing a note (and filling missing fields) so each pass makes progress.

export async function countUnreviewedDraftIngredients(): Promise<number> {
  const sql = getDb();
  const rows = await sql`SELECT count(*)::int AS n FROM ingredients WHERE status = 'draft' AND review_note IS NULL`;
  return (rows[0] as { n: number }).n;
}

export async function getUnreviewedDraftIngredients(limit: number): Promise<Ingredient[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM ingredients
    WHERE status = 'draft' AND review_note IS NULL
    ORDER BY created_at
    LIMIT ${limit}
  `;
  return (rows as IngredientRow[]).map(rowToIngredient);
}

export interface IngredientReviewPatch {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  allergens: string[];
  dietType: DietType | null;
  reviewNote: string;
}

// Applies the (already merged) reviewed values and stamps the review note.
export async function applyIngredientReview(id: string, patch: IngredientReviewPatch): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE ingredients SET
      calories = ${patch.calories},
      protein_g = ${patch.proteinG},
      carbs_g = ${patch.carbsG},
      fat_g = ${patch.fatG},
      allergens = ${patch.allergens},
      diet_type = ${patch.dietType},
      review_note = ${patch.reviewNote},
      updated_at = now()
    WHERE id = ${id}
  `;
}

export async function setIngredientStatus(id: string, status: IngredientStatus): Promise<Ingredient> {
  const sql = getDb();
  const rows = await sql`
    UPDATE ingredients SET status = ${status}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) throw new Error('Ingredient not found');
  return rowToIngredient(rows[0] as IngredientRow);
}

export async function deleteIngredient(id: string): Promise<void> {
  const sql = getDb();
  // meal_ingredients references ingredients with ON DELETE RESTRICT, so deleting an
  // ingredient that's still attached to a meal raises a foreign-key error. Surface a
  // friendly message instead of the raw Postgres error.
  try {
    await sql`DELETE FROM ingredients WHERE id = ${id}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/foreign key|violates/i.test(msg)) {
      throw new Error('This ingredient is still used by one or more meals. Remove it from them first.');
    }
    throw e;
  }
}
