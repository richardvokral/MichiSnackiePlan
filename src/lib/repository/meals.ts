import 'server-only';
import { getDb } from '@/lib/db/client';
import { Meal, MealCatalogStatus } from '@/lib/types';
import { z } from 'zod/v4';

const mealSlotSchema = z.enum(['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner']);
const proteinGroupSchema = z.enum(['dairy', 'eggs', 'meat', 'fish', 'plant', 'nuts_seeds', 'supplement_protein']);
const mealStyleSchema = z.enum(['sweet', 'savory', 'bowl', 'sandwich', 'salad', 'light', 'main_meal']);
const fruitOrVegSchema = z.enum(['fruit', 'veg', 'both', 'none']);
const catalogStatusSchema = z.enum(['draft', 'published', 'inactive']);

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
  };
}

export async function getPublishedMeals(): Promise<Meal[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM meals WHERE status = 'published' ORDER BY created_at`;
  return (rows as MealRow[]).map(rowToMeal);
}

export async function getAllMeals(statusFilter?: MealCatalogStatus): Promise<Meal[]> {
  const sql = getDb();
  if (statusFilter) {
    const rows = await sql`SELECT * FROM meals WHERE status = ${statusFilter} ORDER BY created_at DESC`;
    return (rows as MealRow[]).map(rowToMeal);
  }
  const rows = await sql`SELECT * FROM meals ORDER BY created_at DESC`;
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
  return { ...rowToMeal(row), updatedAt: row.updated_at };
}

export async function createMeal(input: MealInput): Promise<Meal> {
  const data = mealInputSchema.parse(input);
  const sql = getDb();
  const id = data.id || `meal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rows = await sql`
    INSERT INTO meals (id, name, description, meal_slot_allowed, category, main_protein, protein_group, carb_base, meal_style, fruit_or_veg, tags, emoji, image_url, status)
    VALUES (${id}, ${data.name}, ${data.description}, ${data.mealSlotAllowed}, ${data.category}, ${data.mainProtein}, ${data.proteinGroup}, ${data.carbBase}, ${data.mealStyle}, ${data.fruitOrVeg}, ${data.tags}, ${data.emoji}, ${data.imageUrl}, ${data.status})
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
