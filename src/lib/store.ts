import { DailyPlan, MealSlotId, SlotState, SLOT_ORDER } from './types';

const STORAGE_KEY = 'michi_daily_plan';

function createFreshPlan(date: string): DailyPlan {
  const slots: SlotState[] = SLOT_ORDER.map((slot, index) => ({
    slot,
    status: index === 0 ? 'active' : 'planned',
    selectedMealId: null,
    selectedAt: null,
  }));
  return { date, slots };
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyPlan(): DailyPlan {
  if (typeof window === 'undefined') {
    return createFreshPlan(getToday());
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const plan: DailyPlan = JSON.parse(stored);
    if (plan.date === getToday()) {
      return plan;
    }
  }
  const fresh = createFreshPlan(getToday());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

export function saveDailyPlan(plan: DailyPlan): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

function advanceNextSlot(plan: DailyPlan): DailyPlan {
  const nextPlanned = plan.slots.find((s) => s.status === 'planned');
  if (nextPlanned) {
    nextPlanned.status = 'active';
  }
  return plan;
}

export function selectMeal(slot: MealSlotId, mealId: string): DailyPlan {
  const plan = getDailyPlan();
  const target = plan.slots.find((s) => s.slot === slot);
  if (target) {
    target.status = 'completed';
    target.selectedMealId = mealId;
    target.selectedAt = new Date().toISOString();
  }
  advanceNextSlot(plan);
  saveDailyPlan(plan);
  return plan;
}

export function skipMeal(slot: MealSlotId): DailyPlan {
  const plan = getDailyPlan();
  const target = plan.slots.find((s) => s.slot === slot);
  if (target) {
    target.status = 'skipped';
    target.selectedMealId = null;
    target.selectedAt = new Date().toISOString();
  }
  advanceNextSlot(plan);
  saveDailyPlan(plan);
  return plan;
}

export function getCompletedCount(plan: DailyPlan): number {
  return plan.slots.filter((s) => s.status === 'completed').length;
}

export function getActiveSlot(plan: DailyPlan): MealSlotId | null {
  const active = plan.slots.find((s) => s.status === 'active');
  return active?.slot ?? null;
}

// Returns a reference-stable snapshot for useSyncExternalStore. Only allocates a
// new object when the underlying plan actually changes, preventing render loops.
let snapshotCache: { key: string; plan: DailyPlan } | null = null;

export function getDailyPlanSnapshot(): DailyPlan {
  const plan = getDailyPlan();
  const key = JSON.stringify(plan);
  if (!snapshotCache || snapshotCache.key !== key) {
    snapshotCache = { key, plan };
  }
  return snapshotCache.plan;
}
