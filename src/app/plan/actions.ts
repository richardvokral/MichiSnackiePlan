'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { getUserPlan, saveUserPlan } from '@/lib/repository';
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
