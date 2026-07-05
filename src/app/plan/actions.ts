'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import {
  getUserPlan,
  saveUserPlan,
  createFreshSlots,
  getPublishedMealsForUser,
  getRecommendationConfig,
  getRecentSelectedMealIds,
  getUserPreferences,
  getUserDietPreferences,
} from '@/lib/repository';
import { getRecommendations } from '@/lib/recommendations';
import { MealSlotId, SlotState } from '@/lib/types';

function advanceNextSlot(slots: SlotState[]): void {
  const next = slots.find((s) => s.status === 'planned');
  if (next) next.status = 'active';
}

export async function selectMealForDay(date: string, slot: MealSlotId, mealId: string): Promise<void> {
  const user = await requireUser();
  const plan = await getUserPlan(user.id, date);
  const target = plan.slots.find((s) => s.slot === slot);
  if (target) {
    target.status = 'completed';
    target.selectedMealId = mealId;
    target.selectedAt = new Date().toISOString();
  }
  advanceNextSlot(plan.slots);
  await saveUserPlan(user.id, date, plan.slots);
  revalidatePath('/');
}

export async function skipMealForDay(date: string, slot: MealSlotId): Promise<void> {
  const user = await requireUser();
  const plan = await getUserPlan(user.id, date);
  const target = plan.slots.find((s) => s.slot === slot);
  if (target) {
    target.status = 'skipped';
    target.selectedMealId = null;
    target.selectedAt = new Date().toISOString();
  }
  advanceNextSlot(plan.slots);
  await saveUserPlan(user.id, date, plan.slots);
  revalidatePath('/');
}

// One-tap "plan my day": fills every empty (non-skipped) slot with the engine's
// top pick. Fills in slot order and re-runs the engine after each pick so the
// usual same-day variety rules apply between the auto-chosen meals too.
export async function autoFillDay(date: string): Promise<void> {
  const user = await requireUser();
  const [plan, meals, config, prefs, dietPreferences] = await Promise.all([
    getUserPlan(user.id, date),
    getPublishedMealsForUser(user.id),
    getRecommendationConfig(),
    getUserPreferences(user.id),
    getUserDietPreferences(user.id),
  ]);
  const recentMealIds = await getRecentSelectedMealIds(
    user.id,
    date,
    config.thresholds.crossDayLookbackDays,
  );

  let filled = false;
  for (const slotState of plan.slots) {
    if (slotState.selectedMealId || slotState.status === 'skipped') continue;
    const ranked = getRecommendations(slotState.slot, plan, meals, config, {
      recentMealIds,
      pinnedMealId: prefs[slotState.slot] ?? null,
      dietPreferences,
    });
    const pick = ranked[0];
    if (!pick) continue; // nothing eligible for this slot (e.g. strict diet) — leave it open
    slotState.status = 'completed';
    slotState.selectedMealId = pick.id;
    slotState.selectedAt = new Date().toISOString();
    filled = true;
  }

  if (filled) {
    await saveUserPlan(user.id, date, plan.slots);
  }
  revalidatePath('/');
  revalidatePath('/week');
}

// Reset a day back to an unplanned state (used from the week view).
export async function clearDay(date: string): Promise<void> {
  const user = await requireUser();
  await saveUserPlan(user.id, date, createFreshSlots());
  revalidatePath('/');
  revalidatePath('/week');
}
