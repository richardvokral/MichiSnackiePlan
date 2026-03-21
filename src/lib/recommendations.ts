import { Meal, MealSlotId, DailyPlan, SLOT_ORDER } from './types';
import { getMealById } from '@/data/meals';

export function getRecommendations(
  slot: MealSlotId,
  plan: DailyPlan,
  allMeals: Meal[]
): Meal[] {
  const slotIndex = SLOT_ORDER.indexOf(slot);
  const selectedMealIds = plan.slots
    .filter((s) => s.selectedMealId)
    .map((s) => s.selectedMealId!);

  const selectedMeals = selectedMealIds
    .map((id) => getMealById(id))
    .filter(Boolean) as Meal[];

  // Find the previous meal (last completed/skipped before current slot)
  let previousMeal: Meal | null = null;
  for (let i = slotIndex - 1; i >= 0; i--) {
    const prevSlot = plan.slots[i];
    if (prevSlot.selectedMealId) {
      previousMeal = getMealById(prevSlot.selectedMealId) ?? null;
      break;
    }
  }

  // Step 1: Filter by allowed slot
  let candidates = allMeals.filter((m) => m.mealSlotAllowed.includes(slot));

  // Step 2: Hard rule exclusions
  candidates = candidates.filter((meal) => {
    // No repeating exact meal in one day
    if (selectedMealIds.includes(meal.id)) return false;

    if (previousMeal) {
      // No repeating same main protein as previous meal
      if (meal.mainProtein === previousMeal.mainProtein) return false;
      // No repeating same protein group as previous meal
      if (meal.proteinGroup === previousMeal.proteinGroup) return false;
      // No repeating same category as previous meal
      if (meal.category === previousMeal.category) return false;
    }

    // Lunch/dinner must have vegetables
    if ((slot === 'lunch' || slot === 'dinner') &&
        meal.fruitOrVeg !== 'veg' && meal.fruitOrVeg !== 'both') {
      return false;
    }

    return true;
  });

  // Step 3: Scoring
  const scored = candidates.map((meal) => {
    let score = 100;

    // Penalize repeating carb base from earlier today
    if (selectedMeals.some((m) => m.carbBase === meal.carbBase && meal.carbBase !== 'none')) {
      score -= 20;
    }

    // Penalize too many dairy meals
    const dairyCount = selectedMeals.filter((m) => m.proteinGroup === 'dairy').length;
    if (meal.proteinGroup === 'dairy' && dairyCount >= 2) {
      score -= 15;
    }

    // Penalize too many bread meals
    const breadCount = selectedMeals.filter((m) => m.carbBase === 'bread').length;
    if (meal.carbBase === 'bread' && breadCount >= 2) {
      score -= 10;
    }

    // Penalize same style as previous
    if (previousMeal) {
      const sharedStyles = meal.mealStyle.filter((s) =>
        previousMeal!.mealStyle.includes(s)
      );
      if (sharedStyles.length > 0) {
        score -= 10;
      }

      // Reward alternating sweet/savory
      const prevIsSweet = previousMeal.mealStyle.includes('sweet');
      const thisIsSweet = meal.mealStyle.includes('sweet');
      if (prevIsSweet !== thisIsSweet) {
        score += 10;
      }
    }

    // Reward new category
    const usedCategories = selectedMeals.map((m) => m.category);
    if (!usedCategories.includes(meal.category)) {
      score += 5;
    }

    return { meal, score };
  });

  // Step 4: Sort by score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.meal);
}
