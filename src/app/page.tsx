import { getPublishedMeals } from '@/lib/repository';
import { Meal } from '@/lib/types';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const meals = await getPublishedMeals();
  const mealMap: Record<string, Meal> = {};
  for (const m of meals) {
    mealMap[m.id] = m;
  }
  return <HomeClient mealMap={mealMap} />;
}
