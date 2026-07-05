// Pure nutrition aggregation, shared by server (meal detail) and client.
import { MealIngredient, MealNutrition } from './types';

// Whole-day (or any multi-meal) totals. Sums each meal's nutrition; a meal with
// no ingredient data at all can't contribute, so it marks the total approximate.
export interface DayNutrition extends MealNutrition {
  mealsCounted: number;
}

export function computeDayNutrition(
  selectedMealIds: string[],
  ingredientsByMealId: Record<string, MealIngredient[]>,
): DayNutrition {
  let calories = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let approximate = false;
  let mealsCounted = 0;

  for (const mealId of selectedMealIds) {
    const items = ingredientsByMealId[mealId];
    if (!items || items.length === 0) {
      approximate = true;
      continue;
    }
    const meal = computeNutrition(items);
    calories += meal.calories;
    proteinG += meal.proteinG;
    carbsG += meal.carbsG;
    fatG += meal.fatG;
    if (meal.approximate) approximate = true;
    mealsCounted += 1;
  }

  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    calories: round(calories),
    proteinG: round(proteinG),
    carbsG: round(carbsG),
    fatG: round(fatG),
    approximate,
    mealsCounted,
  };
}

// Units we can scale by weight/volume against per-100g nutrition. Anything else
// (e.g. "piece") can't be converted without a gram weight we don't model yet, so
// it's excluded from totals and flags the result as approximate.
const SCALABLE_UNITS = new Set(['g', 'ml']);

function add(total: number, value: number | null | undefined, factor: number): number {
  if (value == null) return total;
  return total + value * factor;
}

export function computeNutrition(items: MealIngredient[]): MealNutrition {
  let calories = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let approximate = false;

  for (const item of items) {
    const ing = item.ingredient;
    if (!ing) {
      approximate = true;
      continue;
    }
    if (!SCALABLE_UNITS.has(item.unit) || !(item.quantity > 0)) {
      approximate = true;
      continue;
    }
    const factor = item.quantity / 100;
    calories = add(calories, ing.calories, factor);
    proteinG = add(proteinG, ing.proteinG, factor);
    carbsG = add(carbsG, ing.carbsG, factor);
    fatG = add(fatG, ing.fatG, factor);
    // If an included ingredient is missing all macros, totals understate reality.
    if (ing.calories == null && ing.proteinG == null && ing.carbsG == null && ing.fatG == null) {
      approximate = true;
    }
  }

  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    calories: round(calories),
    proteinG: round(proteinG),
    carbsG: round(carbsG),
    fatG: round(fatG),
    approximate,
  };
}
