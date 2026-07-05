// Pure shopping-list aggregation over planned meals. Client-safe, like
// nutrition.ts. Quantities are summed per ingredient *per unit* — grams with
// grams, pieces with pieces — so unlike units are never mixed into one number.
import { MealIngredient } from './types';

export interface ShoppingListItem {
  key: string; // stable identity for checklist state: `${ingredientId}|${unit}`
  ingredientId: string;
  name: string;
  unit: string;
  quantity: number;
  mealNames: string[]; // unique meal names that use this ingredient
}

export interface ShoppingList {
  items: ShoppingListItem[];
  // Planned meals with no ingredient data — they can't contribute to the list,
  // so the UI can say "not covered" instead of silently under-buying.
  missingMeals: string[];
}

export function buildShoppingList(
  // One entry per planned occurrence: a meal planned twice appears twice.
  mealOccurrences: { mealId: string; mealName: string }[],
  ingredientsByMealId: Record<string, MealIngredient[]>,
): ShoppingList {
  const byKey = new Map<string, ShoppingListItem>();
  const missing = new Set<string>();

  for (const { mealId, mealName } of mealOccurrences) {
    const items = ingredientsByMealId[mealId];
    if (!items || items.length === 0) {
      missing.add(mealName);
      continue;
    }
    for (const mi of items) {
      const key = `${mi.ingredientId}|${mi.unit}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.quantity += mi.quantity;
        if (!existing.mealNames.includes(mealName)) existing.mealNames.push(mealName);
      } else {
        byKey.set(key, {
          key,
          ingredientId: mi.ingredientId,
          name: mi.ingredient?.name ?? mi.ingredientId,
          unit: mi.unit,
          quantity: mi.quantity,
          mealNames: [mealName],
        });
      }
    }
  }

  const round = (n: number) => Math.round(n * 10) / 10;
  const items = [...byKey.values()]
    .map((item) => ({ ...item, quantity: round(item.quantity) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { items, missingMeals: [...missing].sort() };
}
