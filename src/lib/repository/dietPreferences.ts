import 'server-only';
import { getDb } from '@/lib/db/client';
import { DietPreferences, DietType } from '@/lib/diet';
import { EnergyUnit, isEnergyUnit } from '@/lib/units';
import { UserGoals } from '@/lib/goals';

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
  // Note: only touches diet_type/allergies, so a previously-set energy_unit is preserved.
  await sql`
    INSERT INTO user_diet_preferences (user_id, diet_type, allergies, updated_at)
    VALUES (${userId}, ${prefs.dietType}, ${prefs.allergies}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      diet_type = ${prefs.dietType},
      allergies = ${prefs.allergies},
      updated_at = now()
  `;
}

export async function getUserEnergyUnit(userId: string): Promise<EnergyUnit> {
  const sql = getDb();
  const rows = await sql`SELECT energy_unit FROM user_diet_preferences WHERE user_id = ${userId}`;
  const value = (rows[0] as { energy_unit: string | null } | undefined)?.energy_unit;
  return isEnergyUnit(value) ? value : 'kcal';
}

export async function setUserEnergyUnit(userId: string, unit: EnergyUnit): Promise<void> {
  const sql = getDb();
  // Only touches energy_unit, so existing diet_type/allergies are preserved.
  await sql`
    INSERT INTO user_diet_preferences (user_id, energy_unit, updated_at)
    VALUES (${userId}, ${unit}, now())
    ON CONFLICT (user_id) DO UPDATE SET energy_unit = ${unit}, updated_at = now()
  `;
}

export async function getUserGoals(userId: string): Promise<UserGoals> {
  const sql = getDb();
  const rows = await sql`SELECT target_kcal, target_protein_g FROM user_diet_preferences WHERE user_id = ${userId}`;
  const row = rows[0] as { target_kcal: number | null; target_protein_g: number | null } | undefined;
  return {
    targetKcal: row?.target_kcal ?? null,
    targetProteinG: row?.target_protein_g ?? null,
  };
}

// Nulls clear the targets (goals are optional). Only touches the target columns,
// so diet_type/allergies/energy_unit are preserved.
export async function setUserGoals(userId: string, goals: UserGoals): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO user_diet_preferences (user_id, target_kcal, target_protein_g, updated_at)
    VALUES (${userId}, ${goals.targetKcal}, ${goals.targetProteinG}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      target_kcal = ${goals.targetKcal},
      target_protein_g = ${goals.targetProteinG},
      updated_at = now()
  `;
}
