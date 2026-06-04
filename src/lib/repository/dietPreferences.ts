import 'server-only';
import { getDb } from '@/lib/db/client';
import { DietPreferences, DietType } from '@/lib/diet';

interface DietPrefRow {
  diet_type: string | null;
  allergies: string[];
}

export async function getUserDietPreferences(userId: string): Promise<DietPreferences | null> {
  const sql = getDb();
  const rows = await sql`SELECT diet_type, allergies FROM user_diet_preferences WHERE user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0] as DietPrefRow;
  return {
    dietType: (row.diet_type as DietType | null) ?? null,
    allergies: row.allergies ?? [],
  };
}

export async function setUserDietPreferences(userId: string, prefs: DietPreferences): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO user_diet_preferences (user_id, diet_type, allergies, updated_at)
    VALUES (${userId}, ${prefs.dietType}, ${prefs.allergies}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      diet_type = ${prefs.dietType},
      allergies = ${prefs.allergies},
      updated_at = now()
  `;
}
