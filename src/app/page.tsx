import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getPublishedMealsForUser, getUserPlan, getUserDietPreferences } from '@/lib/repository';
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
  if (user) {
    const [plan, admin, dietPrefs] = await Promise.all([
      getUserPlan(user.id, selectedDate),
      isAdmin(user.email),
      getUserDietPreferences(user.id),
    ]);
    initialPlan = plan;
    userIsAdmin = admin;
    hasDietPrefs = Boolean(dietPrefs && (dietPrefs.dietType || dietPrefs.allergies.length > 0));
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
    />
  );
}
