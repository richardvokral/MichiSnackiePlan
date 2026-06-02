import 'server-only';
import { getDb } from '@/lib/db/client';
import { MealSlotId } from '@/lib/types';

export type MealPreferences = Partial<Record<MealSlotId, string>>;

export async function getUserPreferences(userId: string): Promise<MealPreferences> {
  const sql = getDb();
  const rows = await sql`SELECT slot, meal_id FROM user_meal_preferences WHERE user_id = ${userId}`;
  const prefs: MealPreferences = {};
  for (const row of rows) {
    prefs[row.slot as MealSlotId] = row.meal_id as string;
  }
  return prefs;
}

export async function setUserPreference(userId: string, slot: MealSlotId, mealId: string): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO user_meal_preferences (user_id, slot, meal_id)
    VALUES (${userId}, ${slot}, ${mealId})
    ON CONFLICT (user_id, slot) DO UPDATE SET meal_id = ${mealId}
  `;
}

export async function removeUserPreference(userId: string, slot: MealSlotId): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM user_meal_preferences WHERE user_id = ${userId} AND slot = ${slot}`;
}
