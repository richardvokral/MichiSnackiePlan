import 'server-only';
import { getDb } from '@/lib/db/client';
import { MealIngredient, Ingredient, IngredientStatus } from '@/lib/types';
import { DietType } from '@/lib/diet';

interface MealIngredientJoinRow {
  ingredient_id: string;
  quantity: string; // numeric → string
  unit: string;
  sort_order: number;
  i_name: string;
  i_calories: string | null;
  i_protein_g: string | null;
  i_carbs_g: string | null;
  i_fat_g: string | null;
  i_allergens: string[] | null;
  i_diet_type: string | null;
  i_usda_fdc_id: string | null;
  i_status: string | null;
  i_source: string | null;
}

function num(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function rowToMealIngredient(row: MealIngredientJoinRow): MealIngredient {
  const ingredient: Ingredient = {
    id: row.ingredient_id,
    name: row.i_name,
    calories: num(row.i_calories),
    proteinG: num(row.i_protein_g),
    carbsG: num(row.i_carbs_g),
    fatG: num(row.i_fat_g),
    allergens: row.i_allergens ?? [],
    dietType: (row.i_diet_type as DietType | null) ?? null,
    usdaFdcId: row.i_usda_fdc_id,
    status: (row.i_status as IngredientStatus | null) ?? 'published',
    source: (row.i_source as Ingredient['source'] | null) ?? 'manual',
  };
  return {
    ingredientId: row.ingredient_id,
    quantity: Number(row.quantity),
    unit: row.unit,
    sortOrder: row.sort_order,
    ingredient,
  };
}

export async function getMealIngredients(mealId: string): Promise<MealIngredient[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT mi.ingredient_id, mi.quantity, mi.unit, mi.sort_order,
           i.name AS i_name, i.calories AS i_calories, i.protein_g AS i_protein_g,
           i.carbs_g AS i_carbs_g, i.fat_g AS i_fat_g, i.allergens AS i_allergens,
           i.diet_type AS i_diet_type, i.usda_fdc_id AS i_usda_fdc_id,
           i.status AS i_status, i.source AS i_source
    FROM meal_ingredients mi
    JOIN ingredients i ON i.id = mi.ingredient_id
    WHERE mi.meal_id = ${mealId}
    ORDER BY mi.sort_order, i.name
  `;
  return (rows as MealIngredientJoinRow[]).map(rowToMealIngredient);
}

export interface MealIngredientInput {
  ingredientId: string;
  quantity: number;
  unit: string;
}

// Replace the full ingredient list for a meal. Neon's HTTP driver has no
// multi-statement transaction on the tagged template, so this is a delete-then-
// insert (admin-only writes, low contention — acceptable).
export async function setMealIngredients(mealId: string, items: MealIngredientInput[]): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM meal_ingredients WHERE meal_id = ${mealId}`;
  let sortOrder = 0;
  for (const item of items) {
    await sql`
      INSERT INTO meal_ingredients (meal_id, ingredient_id, quantity, unit, sort_order)
      VALUES (${mealId}, ${item.ingredientId}, ${item.quantity}, ${item.unit}, ${sortOrder})
      ON CONFLICT (meal_id, ingredient_id) DO UPDATE SET
        quantity = ${item.quantity}, unit = ${item.unit}, sort_order = ${sortOrder}
    `;
    sortOrder += 1;
  }
}
