import 'server-only';
import { getDb } from '@/lib/db/client';
import { DailyPlan, SlotState, SLOT_ORDER } from '@/lib/types';

export function createFreshSlots(): SlotState[] {
  return SLOT_ORDER.map((slot, index) => ({
    slot,
    status: index === 0 ? 'active' : 'planned',
    selectedMealId: null,
    selectedAt: null,
  }));
}

export async function getUserPlan(userId: string, date: string): Promise<DailyPlan> {
  const sql = getDb();
  const rows = await sql`SELECT slots FROM user_daily_plans WHERE user_id = ${userId} AND date = ${date}`;
  if (rows.length === 0) {
    return { date, slots: createFreshSlots() };
  }
  return { date, slots: rows[0].slots as SlotState[] };
}

export async function saveUserPlan(userId: string, date: string, slots: SlotState[]): Promise<void> {
  const sql = getDb();
  const json = JSON.stringify(slots);
  await sql`
    INSERT INTO user_daily_plans (user_id, date, slots)
    VALUES (${userId}, ${date}, ${json}::jsonb)
    ON CONFLICT (user_id, date) DO UPDATE SET slots = ${json}::jsonb, updated_at = now()
  `;
}

export async function listUserPlanDates(userId: string): Promise<string[]> {
  const sql = getDb();
  const rows = await sql`SELECT date FROM user_daily_plans WHERE user_id = ${userId} ORDER BY date DESC LIMIT 30`;
  return rows.map((r) => r.date as string);
}

// Meal ids selected on the days immediately before `beforeDate`, used to nudge
// cross-day variety in recommendations.
export async function getRecentSelectedMealIds(
  userId: string,
  beforeDate: string,
  days: number,
): Promise<string[]> {
  if (days <= 0) return [];
  const sql = getDb();
  const rows = await sql`
    SELECT slots FROM user_daily_plans
    WHERE user_id = ${userId} AND date < ${beforeDate}
    ORDER BY date DESC LIMIT ${days}
  `;
  const ids: string[] = [];
  for (const row of rows) {
    for (const slot of row.slots as SlotState[]) {
      if (slot.selectedMealId) ids.push(slot.selectedMealId);
    }
  }
  return ids;
}
