import { getCurrentUser } from '@/lib/auth';
import {
  getPublishedMeals,
  getRecommendationConfig,
  getUserPlan,
  getRecentSelectedMealIds,
  getUserPreferences,
} from '@/lib/repository';
import { DailyPlan, MealSlotId } from '@/lib/types';
import SelectClient from './SelectClient';

export const dynamic = 'force-dynamic';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function SelectMealPage({
  params,
  searchParams,
}: {
  params: Promise<{ slot: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { slot } = await params;
  const { date } = await searchParams;
  const slotId = slot as MealSlotId;

  const user = await getCurrentUser();
  const [meals, config] = await Promise.all([getPublishedMeals(), getRecommendationConfig()]);

  const today = todayStr();
  const selectedDate = user && date ? date : today;

  let initialPlan: DailyPlan | null = null;
  let recentMealIds: string[] = [];
  let pinnedMealId: string | null = null;

  if (user) {
    [initialPlan, recentMealIds] = await Promise.all([
      getUserPlan(user.id, selectedDate),
      getRecentSelectedMealIds(user.id, selectedDate, config.thresholds.crossDayLookbackDays),
    ]);
    const prefs = await getUserPreferences(user.id);
    pinnedMealId = prefs[slotId] ?? null;
  }

  return (
    <SelectClient
      slot={slotId}
      meals={meals}
      config={config}
      isAuthenticated={Boolean(user)}
      date={selectedDate}
      initialPlan={initialPlan}
      recentMealIds={recentMealIds}
      pinnedMealId={pinnedMealId}
    />
  );
}
