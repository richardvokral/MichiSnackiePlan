import { Meal, MealSlotId, DailyPlan, SLOT_ORDER } from './types';
import {
  RecommendationConfig,
  DEFAULT_RECOMMENDATION_CONFIG,
} from './recommendationConfig';

export interface RecommendationContext {
  // Meal ids selected on recent previous days (for cross-day variety).
  recentMealIds?: string[];
  // The user's pinned recurring meal for this slot (e.g. oatmeal every breakfast).
  pinnedMealId?: string | null;
}

export function getRecommendations(
  slot: MealSlotId,
  plan: DailyPlan,
  allMeals: Meal[],
  config: RecommendationConfig = DEFAULT_RECOMMENDATION_CONFIG,
  context: RecommendationContext = {},
): Meal[] {
  const recentMealIds = new Set(context.recentMealIds ?? []);
  const slotIndex = SLOT_ORDER.indexOf(slot);
  const mealMap = new Map(allMeals.map((m) => [m.id, m]));

  const selectedMealIds = plan.slots
    .filter((s) => s.selectedMealId)
    .map((s) => s.selectedMealId!);

  const selectedMeals = selectedMealIds
    .map((id) => mealMap.get(id))
    .filter(Boolean) as Meal[];

  let previousMeal: Meal | null = null;
  for (let i = slotIndex - 1; i >= 0; i--) {
    const prevSlot = plan.slots[i];
    if (prevSlot.selectedMealId) {
      previousMeal = mealMap.get(prevSlot.selectedMealId) ?? null;
      break;
    }
  }

  let candidates = allMeals.filter((m) => m.mealSlotAllowed.includes(slot));

  candidates = candidates.filter((meal) => {
    if (config.rules.noExactRepeat && selectedMealIds.includes(meal.id)) return false;

    if (previousMeal) {
      if (config.rules.noSameMainProteinAsPrev && meal.mainProtein === previousMeal.mainProtein) return false;
      if (config.rules.noSameProteinGroupAsPrev && meal.proteinGroup === previousMeal.proteinGroup) return false;
      if (config.rules.noSameCategoryAsPrev && meal.category === previousMeal.category) return false;
    }

    if (config.rules.lunchDinnerRequireVeg &&
        (slot === 'lunch' || slot === 'dinner') &&
        meal.fruitOrVeg !== 'veg' && meal.fruitOrVeg !== 'both') {
      return false;
    }

    return true;
  });

  const scored = candidates.map((meal) => {
    let score = config.baseScore;

    if (selectedMeals.some((m) => m.carbBase === meal.carbBase && meal.carbBase !== 'none')) {
      score += config.weights.repeatCarbBasePenalty;
    }

    const dairyCount = selectedMeals.filter((m) => m.proteinGroup === 'dairy').length;
    if (meal.proteinGroup === 'dairy' && dairyCount >= config.thresholds.dairyCountThreshold) {
      score += config.weights.tooMuchDairyPenalty;
    }

    const breadCount = selectedMeals.filter((m) => m.carbBase === 'bread').length;
    if (meal.carbBase === 'bread' && breadCount >= config.thresholds.breadCountThreshold) {
      score += config.weights.tooMuchBreadPenalty;
    }

    if (previousMeal) {
      const sharedStyles = meal.mealStyle.filter((s) =>
        previousMeal!.mealStyle.includes(s)
      );
      if (sharedStyles.length > 0) {
        score += config.weights.sameStyleAsPrevPenalty;
      }

      const prevIsSweet = previousMeal.mealStyle.includes('sweet');
      const thisIsSweet = meal.mealStyle.includes('sweet');
      if (prevIsSweet !== thisIsSweet) {
        score += config.weights.alternatingSweetSavoryReward;
      }
    }

    const usedCategories = selectedMeals.map((m) => m.category);
    if (!usedCategories.includes(meal.category)) {
      score += config.weights.newCategoryReward;
    }

    // Cross-day variety: discourage meals eaten in the recent lookback window.
    if (config.rules.crossDayVarietyEnabled && recentMealIds.has(meal.id)) {
      score += config.weights.crossDayRepeatPenalty;
    }

    return { meal, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const ordered = scored.map((s) => s.meal);

  // A pinned recurring preference always surfaces first ("your usual").
  if (context.pinnedMealId) {
    const pinnedIndex = ordered.findIndex((m) => m.id === context.pinnedMealId);
    if (pinnedIndex > 0) {
      const [pinned] = ordered.splice(pinnedIndex, 1);
      ordered.unshift(pinned);
    }
  }

  return ordered;
}
