import { getPublishedMeals, getRecommendationConfig } from '@/lib/repository';
import { MealSlotId } from '@/lib/types';
import SelectClient from './SelectClient';

export default async function SelectMealPage({
  params,
}: {
  params: Promise<{ slot: string }>;
}) {
  const { slot } = await params;

  const [meals, config] = await Promise.all([
    getPublishedMeals(),
    getRecommendationConfig(),
  ]);

  return (
    <SelectClient
      slot={slot as MealSlotId}
      meals={meals}
      config={config}
    />
  );
}
