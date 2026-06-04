import 'server-only';
import { getDb } from '@/lib/db/client';
import { Meal, MealCatalogStatus, MealNutrition } from '@/lib/types';
import { DietType, DIET_TYPES, strictestDiet, dietTypeFromProteinGroup } from '@/lib/diet';
import { getMealIngredients } from './mealIngredients';
import { computeNutrition } from '@/lib/nutrition';
import { z } from 'zod/v4';

const mealSlotSchema = z.enum(['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner']);
const proteinGroupSchema = z.enum(['dairy', 'eggs', 'meat', 'fish', 'plant', 'nuts_seeds', 'supplement_protein']);
const mealStyleSchema = z.enum(['sweet', 'savory', 'bowl', 'sandwich', 'salad', 'light', 'main_meal']);
const fruitOrVegSchema = z.enum(['fruit', 'veg', 'both', 'none']);
const catalogStatusSchema = z.enum(['draft', 'published', 'inactive']);
const dietTypeSchema = z.enum(DIET_TYPES);

export const mealInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  mealSlotAllowed: z.array(mealSlotSchema).min(1),
  category: z.string().min(1).max(100),
  mainProtein: z.string().min(1).max(100),
  proteinGroup: proteinGroupSchema,
  carbBase: z.string().min(1).max(100),
  mealStyle: z.array(mealStyleSchema).min(1),
  fruitOrVeg: fruitOrVegSchema,
  tags: z.array(z.string().max(50)).default([]),
  emoji: z.string().max(10).default(''),
  imageUrl: z.string().url().nullable().default(null),
  status: catalogStatusSchema.default('draft'),
  dietType: dietTypeSchema.nullable().default(null),
  allergens: z.array(z.string().max(50)).default([]),
  allergensOverride: z.boolean().default(false),
});

export type MealInput = z.infer<typeof mealInputSchema>;

interface MealRow {
  id: string;
  name: string;
  description: string;
  meal_slot_allowed: string[];
  category: string;
  main_protein: string;
  protein_group: string;
  carb_base: string;
  meal_style: string[];
  fruit_or_veg: string;
  tags: string[];
  emoji: string;
  image_url: string | null;
  status: string;
  diet_type: string | null;
  allergens: string[] | null;
  allergens_override: boolean | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
}

function rowToMeal(row: MealRow): Meal {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    mealSlotAllowed: row.meal_slot_allowed as Meal['mealSlotAllowed'],
    category: row.category,
    mainProtein: row.main_protein,
    proteinGroup: row.protein_group as Meal['proteinGroup'],
    carbBase: row.carb_base,
    mealStyle: row.meal_style as Meal['mealStyle'],
    fruitOrVeg: row.fruit_or_veg as Meal['fruitOrVeg'],
    tags: row.tags,
    emoji: row.emoji,
    imageUrl: row.image_url,
    status: row.status as Meal['status'],
    dietType: (row.diet_type as DietType | null) ?? null,
    allergens: row.allergens ?? [],
    allergensOverride: row.allergens_override ?? false,
    ownerUserId: row.owner_user_id ?? null,
  };
}

// Public catalog only (owner_user_id IS NULL) — private user meals never leak here.
export async function getPublishedMeals(): Promise<Meal[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM meals WHERE status = 'published' AND owner_user_id IS NULL ORDER BY created_at`;
  return (rows as MealRow[]).map(rowToMeal);
}

// Admin catalog listing — public meals only; users' private meals are not shown here.
export async function getAllMeals(statusFilter?: MealCatalogStatus): Promise<Meal[]> {
  const sql = getDb();
  if (statusFilter) {
    const rows = await sql`SELECT * FROM meals WHERE status = ${statusFilter} AND owner_user_id IS NULL ORDER BY created_at DESC`;
    return (rows as MealRow[]).map(rowToMeal);
  }
  const rows = await sql`SELECT * FROM meals WHERE owner_user_id IS NULL ORDER BY created_at DESC`;
  return (rows as MealRow[]).map(rowToMeal);
}

export async function getMealById(id: string): Promise<Meal | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM meals WHERE id = ${id}`;
  if (rows.length === 0) return null;
  return rowToMeal(rows[0] as MealRow);
}

export async function getMealWithMeta(id: string): Promise<(Meal & { updatedAt: string }) | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM meals WHERE id = ${id}`;
  if (rows.length === 0) return null;
  const row = rows[0] as MealRow;
  // Normalize to a full-precision ISO string so the value round-trips through the
  // edit form unchanged. (Neon returns timestamptz as a Date; rendering it into an
  // input would drop milliseconds and break the optimistic-concurrency check.)
  return { ...rowToMeal(row), updatedAt: new Date(row.updated_at).toISOString() };
}

export async function createMeal(input: MealInput): Promise<Meal> {
  const data = mealInputSchema.parse(input);
  const sql = getDb();
  const id = data.id || `meal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rows = await sql`
    INSERT INTO meals (id, name, description, meal_slot_allowed, category, main_protein, protein_group, carb_base, meal_style, fruit_or_veg, tags, emoji, image_url, status, diet_type, allergens, allergens_override)
    VALUES (${id}, ${data.name}, ${data.description}, ${data.mealSlotAllowed}, ${data.category}, ${data.mainProtein}, ${data.proteinGroup}, ${data.carbBase}, ${data.mealStyle}, ${data.fruitOrVeg}, ${data.tags}, ${data.emoji}, ${data.imageUrl}, ${data.status}, ${data.dietType}, ${data.allergens}, ${data.allergensOverride})
    RETURNING *
  `;
  return rowToMeal(rows[0] as MealRow);
}

export async function updateMeal(
  id: string,
  input: Partial<MealInput>,
  expectedUpdatedAt?: string,
): Promise<Meal> {
  const sql = getDb();

  const existing = await sql`SELECT * FROM meals WHERE id = ${id}`;
  if (existing.length === 0) throw new Error('Meal not found');

  if (expectedUpdatedAt) {
    const existingDate = new Date(existing[0].updated_at as string).toISOString();
    const expectedDate = new Date(expectedUpdatedAt).toISOString();
    if (existingDate !== expectedDate) {
      throw new Error('Conflict: meal was modified by another user');
    }
  }

  const current = existing[0] as MealRow;
  const merged = {
    name: input.name ?? current.name,
    description: input.description ?? current.description,
    meal_slot_allowed: input.mealSlotAllowed ?? current.meal_slot_allowed,
    category: input.category ?? current.category,
    main_protein: input.mainProtein ?? current.main_protein,
    protein_group: input.proteinGroup ?? current.protein_group,
    carb_base: input.carbBase ?? current.carb_base,
    meal_style: input.mealStyle ?? current.meal_style,
    fruit_or_veg: input.fruitOrVeg ?? current.fruit_or_veg,
    tags: input.tags ?? current.tags,
    emoji: input.emoji ?? current.emoji,
    image_url: input.imageUrl !== undefined ? input.imageUrl : current.image_url,
    status: input.status ?? current.status,
    diet_type: input.dietType !== undefined ? input.dietType : current.diet_type,
    allergens: input.allergens ?? current.allergens ?? [],
    allergens_override:
      input.allergensOverride !== undefined ? input.allergensOverride : (current.allergens_override ?? false),
  };

  const rows = await sql`
    UPDATE meals SET
      name = ${merged.name},
      description = ${merged.description},
      meal_slot_allowed = ${merged.meal_slot_allowed},
      category = ${merged.category},
      main_protein = ${merged.main_protein},
      protein_group = ${merged.protein_group},
      carb_base = ${merged.carb_base},
      meal_style = ${merged.meal_style},
      fruit_or_veg = ${merged.fruit_or_veg},
      tags = ${merged.tags},
      emoji = ${merged.emoji},
      image_url = ${merged.image_url},
      status = ${merged.status},
      diet_type = ${merged.diet_type},
      allergens = ${merged.allergens},
      allergens_override = ${merged.allergens_override},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rowToMeal(rows[0] as MealRow);
}

export async function setMealStatus(id: string, status: MealCatalogStatus): Promise<Meal> {
  const sql = getDb();
  const rows = await sql`
    UPDATE meals SET status = ${status}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) throw new Error('Meal not found');
  return rowToMeal(rows[0] as MealRow);
}

interface IngredientDietRow {
  meal_id: string;
  allergens: string[] | null;
  diet_type: string | null;
}

// Replaces each meal's allergen/diet fields with the EFFECTIVE values: derived from
// the meal's ingredients (allergen union, strictest diet), unless the meal carries
// an explicit override. Meals without ingredients keep their manual M1 columns
// (diet still falls back to proteinGroup via the recommendation engine). One extra
// query for the whole set — no N+1.
export async function enrichMealsWithDietInfo(meals: Meal[]): Promise<Meal[]> {
  if (meals.length === 0) return meals;
  const sql = getDb();
  const ids = meals.map((m) => m.id);
  const rows = (await sql`
    SELECT mi.meal_id, i.allergens AS allergens, i.diet_type AS diet_type
    FROM meal_ingredients mi
    JOIN ingredients i ON i.id = mi.ingredient_id
    WHERE mi.meal_id = ANY(${ids}::text[])
  `) as IngredientDietRow[];

  const byMeal = new Map<string, IngredientDietRow[]>();
  for (const r of rows) {
    const arr = byMeal.get(r.meal_id) ?? [];
    arr.push(r);
    byMeal.set(r.meal_id, arr);
  }

  return meals.map((m) => {
    const ingr = byMeal.get(m.id);
    if (!ingr || ingr.length === 0) return m; // no ingredients → keep manual columns

    const derivedAllergens = new Set<string>();
    for (const r of ingr) for (const a of r.allergens ?? []) derivedAllergens.add(a);
    const effectiveAllergens = m.allergensOverride
      ? (m.allergens ?? [])
      : Array.from(new Set([...(m.allergens ?? []), ...derivedAllergens]));

    const ingredientDiet = strictestDiet(ingr.map((r) => r.diet_type as DietType | null));
    const derivedDiet = ingredientDiet ?? dietTypeFromProteinGroup(m.proteinGroup);
    const effectiveDiet = m.dietType ?? derivedDiet;

    return { ...m, allergens: effectiveAllergens, dietType: effectiveDiet };
  });
}

// Published catalog meals with effective (derived/override) allergen + diet info,
// for the selection/home screens that drive the recommendation filter.
export async function getPublishedMealsWithDietInfo(): Promise<Meal[]> {
  const meals = await getPublishedMeals();
  return enrichMealsWithDietInfo(meals);
}

// Full meal detail for the public detail page: ingredients + aggregated nutrition +
// effective allergen/diet info.
export async function getMealDetail(
  id: string,
): Promise<{ meal: Meal; ingredients: import('@/lib/types').MealIngredient[]; nutrition: MealNutrition } | null> {
  const meal = await getMealById(id);
  if (!meal) return null;
  const ingredients = await getMealIngredients(id);
  const [enriched] = await enrichMealsWithDietInfo([meal]);
  const nutrition = computeNutrition(ingredients);
  return { meal: { ...enriched, ingredients, nutrition }, ingredients, nutrition };
}

// Meals selectable by a given user: the public published catalog plus that user's
// own private meals. Anonymous (null) degrades to public-only. Effective diet/
// allergen info is applied so the recommendation filter works for private meals too.
export async function getPublishedMealsForUser(userId: string | null): Promise<Meal[]> {
  if (!userId) return getPublishedMealsWithDietInfo();
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM meals
    WHERE (status = 'published' AND owner_user_id IS NULL) OR owner_user_id = ${userId}
    ORDER BY created_at
  `;
  const meals = (rows as MealRow[]).map(rowToMeal);
  return enrichMealsWithDietInfo(meals);
}

// All meals owned by a user (their "my meals" management list).
export async function listUserMeals(userId: string): Promise<Meal[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM meals WHERE owner_user_id = ${userId} ORDER BY created_at DESC`;
  return (rows as MealRow[]).map(rowToMeal);
}

// Create a meal private to a user. Forced to published so it's immediately usable
// in that user's planning, and stamped with their owner id.
export async function createUserMeal(userId: string, input: MealInput): Promise<Meal> {
  const data = mealInputSchema.parse({ ...input, status: 'published' });
  const sql = getDb();
  const id = `umeal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rows = await sql`
    INSERT INTO meals (id, name, description, meal_slot_allowed, category, main_protein, protein_group, carb_base, meal_style, fruit_or_veg, tags, emoji, image_url, status, diet_type, allergens, allergens_override, owner_user_id)
    VALUES (${id}, ${data.name}, ${data.description}, ${data.mealSlotAllowed}, ${data.category}, ${data.mainProtein}, ${data.proteinGroup}, ${data.carbBase}, ${data.mealStyle}, ${data.fruitOrVeg}, ${data.tags}, ${data.emoji}, ${data.imageUrl}, ${'published'}, ${data.dietType}, ${data.allergens}, ${data.allergensOverride}, ${userId})
    RETURNING *
  `;
  return rowToMeal(rows[0] as MealRow);
}
