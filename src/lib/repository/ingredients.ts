import 'server-only';
import { getDb } from '@/lib/db/client';
import { Ingredient } from '@/lib/types';
import { DietType, DIET_TYPES } from '@/lib/diet';
import { z } from 'zod/v4';

const dietTypeSchema = z.enum(DIET_TYPES);

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
  };
}

export async function listIngredients(): Promise<Ingredient[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM ingredients ORDER BY name`;
  return (rows as IngredientRow[]).map(rowToIngredient);
}

export async function getIngredientById(id: string): Promise<Ingredient | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM ingredients WHERE id = ${id}`;
  if (rows.length === 0) return null;
  return rowToIngredient(rows[0] as IngredientRow);
}

export async function createIngredient(input: IngredientInput): Promise<Ingredient> {
  const data = ingredientInputSchema.parse(input);
  const sql = getDb();
  const id = data.id || `ing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rows = await sql`
    INSERT INTO ingredients (id, name, calories, protein_g, carbs_g, fat_g, allergens, diet_type, usda_fdc_id)
    VALUES (${id}, ${data.name}, ${data.calories}, ${data.proteinG}, ${data.carbsG}, ${data.fatG}, ${data.allergens}, ${data.dietType}, ${data.usdaFdcId})
    RETURNING *
  `;
  return rowToIngredient(rows[0] as IngredientRow);
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
      updated_at = now()
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
