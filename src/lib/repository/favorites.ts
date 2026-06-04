import 'server-only';
import { getDb } from '@/lib/db/client';

export async function getUserFavoriteIds(userId: string): Promise<string[]> {
  const sql = getDb();
  const rows = await sql`SELECT meal_id FROM user_favorites WHERE user_id = ${userId}`;
  return (rows as { meal_id: string }[]).map((r) => r.meal_id);
}

export async function addFavorite(userId: string, mealId: string): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO user_favorites (user_id, meal_id) VALUES (${userId}, ${mealId})
    ON CONFLICT (user_id, meal_id) DO NOTHING
  `;
}

export async function removeFavorite(userId: string, mealId: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM user_favorites WHERE user_id = ${userId} AND meal_id = ${mealId}`;
}
