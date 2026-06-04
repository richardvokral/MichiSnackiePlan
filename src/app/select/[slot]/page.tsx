import { getCurrentUser } from '@/lib/auth';
import {
  getPublishedMealsForUser,
  getRecommendationConfig,
  getUserPlan,
  getRecentSelectedMealIds,
  getUserPreferences,
  getUserDietPreferences,
  getUserFavoriteIds,
} from '@/lib/repository';
import { DailyPlan, MealSlotId } from '@/lib/types';
import { DietPreferences } from '@/lib/diet';
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
  const [meals, config] = await Promise.all([
    getPublishedMealsForUser(user?.id ?? null),
    getRecommendationConfig(),
  ]);

  const today = todayStr();
  const selectedDate = user && date ? date : today;

  let initialPlan: DailyPlan | null = null;
  let recentMealIds: string[] = [];
  let pinnedMealId: string | null = null;
  let dietPreferences: DietPreferences | null = null;
  let favoriteIds: string[] = [];

  if (user) {
    const [plan, recent, prefs, diet, favorites] = await Promise.all([
      getUserPlan(user.id, selectedDate),
      getRecentSelectedMealIds(user.id, selectedDate, config.thresholds.crossDayLookbackDays),
      getUserPreferences(user.id),
      getUserDietPreferences(user.id),
      getUserFavoriteIds(user.id),
    ]);
    initialPlan = plan;
    recentMealIds = recent;
    pinnedMealId = prefs[slotId] ?? null;
    dietPreferences = diet;
    favoriteIds = favorites;
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
      dietPreferences={dietPreferences}
      favoriteIds={favoriteIds}
    />
  );
}
