import { getCurrentUser, isAdmin } from '@/lib/auth';
import {
  getPublishedMealsForUser,
  getUserPlan,
  getUserDietPreferences,
  getMealIngredientsForMeals,
  getUserEnergyUnit,
  getUserGoals,
} from '@/lib/repository';
import { computeDayNutrition, DayNutrition } from '@/lib/nutrition';
import { UserGoals } from '@/lib/goals';
import { EnergyUnit } from '@/lib/units';
import { DailyPlan, Meal } from '@/lib/types';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const user = await getCurrentUser();
  const meals = await getPublishedMealsForUser(user?.id ?? null);
  const mealMap: Record<string, Meal> = {};
  for (const m of meals) mealMap[m.id] = m;

  const today = todayStr();
  const selectedDate = user && date ? date : today;

  let initialPlan: DailyPlan | null = null;
  let userIsAdmin = false;
  let hasDietPrefs = false;
  let dayNutrition: DayNutrition | null = null;
  let goals: UserGoals | null = null;
  let energyUnit: EnergyUnit = 'kcal';
  if (user) {
    const [plan, admin, dietPrefs, userGoals, unit] = await Promise.all([
      getUserPlan(user.id, selectedDate),
      isAdmin(user.email),
      getUserDietPreferences(user.id),
      getUserGoals(user.id),
      getUserEnergyUnit(user.id),
    ]);
    initialPlan = plan;
    userIsAdmin = admin;
    hasDietPrefs = Boolean(dietPrefs && (dietPrefs.dietType || dietPrefs.allergies.length > 0));
    goals = userGoals;
    energyUnit = unit;

    const selectedIds = plan.slots
      .map((s) => s.selectedMealId)
      .filter((id): id is string => Boolean(id));
    if (selectedIds.length > 0) {
      const ingredientsByMealId = await getMealIngredientsForMeals(selectedIds);
      dayNutrition = computeDayNutrition(selectedIds, ingredientsByMealId);
    }
  }

  return (
    <HomeClient
      mealMap={mealMap}
      isAuthenticated={Boolean(user)}
      isAdmin={userIsAdmin}
      userEmail={user?.email ?? null}
      initialPlan={initialPlan}
      date={selectedDate}
      isToday={selectedDate === today}
      hasDietPrefs={hasDietPrefs}
      dayNutrition={dayNutrition}
      goals={goals}
      energyUnit={energyUnit}
    />
  );
}
