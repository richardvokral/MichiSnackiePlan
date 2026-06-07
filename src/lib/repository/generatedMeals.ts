import 'server-only';
import { getDb } from '@/lib/db/client';
import { MealSlotId, ProteinGroup, MealStyle, FruitOrVeg } from '@/lib/types';

export interface IngredientSpec {
  name: string;
  grams: number;
}

export type GeneratedMealStatus = 'pending' | 'finalized' | 'rejected';

export interface GeneratedMeal {
  id: string;
  archetypeId: string | null;
  name: string;
  description: string;
  emoji: string;
  slotHint: string | null;
  mealSlotAllowed: MealSlotId[];
  category: string;
  mainProtein: string;
  proteinGroup: ProteinGroup;
  carbBase: string;
  mealStyle: MealStyle[];
  fruitOrVeg: FruitOrVeg;
  totalWeightG: number | null;
  ingredientsSpec: IngredientSpec[];
  status: GeneratedMealStatus;
  rejectReason: string | null;
  mealId: string | null;
}

export interface GeneratedMealInput {
  archetypeId: string | null;
  name: string;
  description: string;
  emoji: string;
  slotHint: string | null;
  mealSlotAllowed: MealSlotId[];
  category: string;
  mainProtein: string;
  proteinGroup: ProteinGroup;
  carbBase: string;
  mealStyle: MealStyle[];
  fruitOrVeg: FruitOrVeg;
  totalWeightG: number | null;
  ingredientsSpec: IngredientSpec[];
}

interface GeneratedMealRow {
  id: string;
  archetype_id: string | null;
  name: string;
  description: string;
  emoji: string;
  slot_hint: string | null;
  meal_slot_allowed: string[];
  category: string;
  main_protein: string;
  protein_group: string;
  carb_base: string;
  meal_style: string[];
  fruit_or_veg: string;
  total_weight_g: string | null;
  ingredients_spec: IngredientSpec[] | null;
  status: string;
  reject_reason: string | null;
  meal_id: string | null;
}

function rowToGeneratedMeal(row: GeneratedMealRow): GeneratedMeal {
  return {
    id: row.id,
    archetypeId: row.archetype_id,
    name: row.name,
    description: row.description,
    emoji: row.emoji,
    slotHint: row.slot_hint,
    mealSlotAllowed: (row.meal_slot_allowed ?? []) as MealSlotId[],
    category: row.category,
    mainProtein: row.main_protein,
    proteinGroup: row.protein_group as ProteinGroup,
    carbBase: row.carb_base,
    mealStyle: (row.meal_style ?? []) as MealStyle[],
    fruitOrVeg: row.fruit_or_veg as FruitOrVeg,
    totalWeightG: row.total_weight_g === null ? null : Number(row.total_weight_g),
    ingredientsSpec: row.ingredients_spec ?? [],
    status: row.status as GeneratedMealStatus,
    rejectReason: row.reject_reason,
    mealId: row.meal_id,
  };
}

function genId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createGeneratedMeal(input: GeneratedMealInput): Promise<GeneratedMeal> {
  const sql = getDb();
  const id = genId();
  const rows = await sql`
    INSERT INTO generated_meals (
      id, archetype_id, name, description, emoji, slot_hint, meal_slot_allowed, category,
      main_protein, protein_group, carb_base, meal_style, fruit_or_veg, total_weight_g, ingredients_spec
    ) VALUES (
      ${id}, ${input.archetypeId}, ${input.name}, ${input.description}, ${input.emoji}, ${input.slotHint},
      ${input.mealSlotAllowed}, ${input.category}, ${input.mainProtein}, ${input.proteinGroup},
      ${input.carbBase}, ${input.mealStyle}, ${input.fruitOrVeg}, ${input.totalWeightG},
      ${JSON.stringify(input.ingredientsSpec)}::jsonb
    )
    RETURNING *
  `;
  return rowToGeneratedMeal(rows[0] as GeneratedMealRow);
}

export async function listGeneratedMealsByStatus(
  status: GeneratedMealStatus,
  limit = 200,
): Promise<GeneratedMeal[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM generated_meals WHERE status = ${status} ORDER BY created_at DESC LIMIT ${limit}
  `;
  return (rows as GeneratedMealRow[]).map(rowToGeneratedMeal);
}

export async function getPendingGeneratedMeals(limit: number): Promise<GeneratedMeal[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM generated_meals WHERE status = 'pending' ORDER BY created_at LIMIT ${limit}
  `;
  return (rows as GeneratedMealRow[]).map(rowToGeneratedMeal);
}

export async function countGeneratedMealsByStatus(status: GeneratedMealStatus): Promise<number> {
  const sql = getDb();
  const rows = await sql`SELECT count(*)::int AS n FROM generated_meals WHERE status = ${status}`;
  return (rows[0] as { n: number }).n;
}

export async function countCardsForArchetype(archetypeId: string): Promise<number> {
  const sql = getDb();
  const rows = await sql`SELECT count(*)::int AS n FROM generated_meals WHERE archetype_id = ${archetypeId}`;
  return (rows[0] as { n: number }).n;
}

// One grouped query: archetype id → number of staged cards. Used by the variants job
// to pick the next under-quota archetype and decide when all are satisfied.
export async function getCardCountsByArchetype(): Promise<Record<string, number>> {
  const sql = getDb();
  const rows = await sql`SELECT archetype_id, count(*)::int AS n FROM generated_meals WHERE archetype_id IS NOT NULL GROUP BY archetype_id`;
  const map: Record<string, number> = {};
  for (const r of rows as { archetype_id: string; n: number }[]) map[r.archetype_id] = r.n;
  return map;
}

// Distinct, lowercased ingredient names across all PENDING cards — the extraction
// queue + dedupe normalization (matches getIngredientByName's case-insensitive lookup).
export async function getAllPendingIngredientNames(): Promise<string[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT DISTINCT lower(elem->>'name') AS name
    FROM generated_meals, jsonb_array_elements(ingredients_spec) elem
    WHERE status = 'pending' AND elem->>'name' IS NOT NULL
    ORDER BY name
  `;
  return (rows as { name: string }[]).map((r) => r.name).filter(Boolean);
}

export async function markGeneratedMealFinalized(id: string, mealId: string): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE generated_meals SET status = 'finalized', meal_id = ${mealId}, reject_reason = NULL, updated_at = now()
    WHERE id = ${id}
  `;
}

export async function markGeneratedMealRejected(id: string, reason: string): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE generated_meals SET status = 'rejected', reject_reason = ${reason}, updated_at = now()
    WHERE id = ${id}
  `;
}

// Full generated-catalog wipe (the Migrations "Clear nutrition data" reset). Runs in
// one transaction, FK-safe: meal_ingredients must go before ingredients (ON DELETE
// RESTRICT). Keeps meal_archetypes. Private user meal rows survive (owner_user_id set)
// but lose their ingredient links — the UI warns about this.
export async function resetGeneratedData(): Promise<Record<string, number>> {
  const sql = getDb();
  const deleted: Record<string, number> = {};
  const count = async (table: string): Promise<number> => {
    const rows = await sql.query(`SELECT count(*)::int AS n FROM ${table}`);
    return (rows[0] as { n: number }).n;
  };

  deleted.generated_meals = await count('generated_meals');
  deleted.meal_ingredients = await count('meal_ingredients');
  deleted.meals = await count('meals WHERE owner_user_id IS NULL');
  deleted.ingredients = await count('ingredients');
  deleted.ai_ingredient_candidates = await count('ai_ingredient_candidates');
  deleted.ai_generation_jobs = await count('ai_generation_jobs');

  await sql.transaction([
    sql`DELETE FROM generated_meals`,
    sql`DELETE FROM meal_ingredients`,
    sql`DELETE FROM meals WHERE owner_user_id IS NULL`,
    sql`DELETE FROM ingredients`,
    sql`DELETE FROM ai_ingredient_candidates`,
    sql`DELETE FROM ai_generation_jobs`,
  ]);

  return deleted;
}
