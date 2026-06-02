import { getCurrentUser } from '@/lib/auth';
import { getPublishedMeals, getUserPlan } from '@/lib/repository';
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
  const meals = await getPublishedMeals();
  const mealMap: Record<string, Meal> = {};
  for (const m of meals) mealMap[m.id] = m;

  const today = todayStr();
  const selectedDate = user && date ? date : today;

  let initialPlan: DailyPlan | null = null;
  if (user) {
    initialPlan = await getUserPlan(user.id, selectedDate);
  }

  return (
    <HomeClient
      mealMap={mealMap}
      isAuthenticated={Boolean(user)}
      userEmail={user?.email ?? null}
      initialPlan={initialPlan}
      date={selectedDate}
      isToday={selectedDate === today}
    />
  );
}
