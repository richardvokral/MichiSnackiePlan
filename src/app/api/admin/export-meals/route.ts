import { requireAdmin } from '@/lib/auth';
import { getAllMeals, getMealIngredients } from '@/lib/repository';
import { computeNutrition } from '@/lib/nutrition';

export const dynamic = 'force-dynamic';

// Plain-text backup of the current catalog meals (metadata + ingredients + computed
// nutrition), plus a machine-readable JSON block so it can be re-imported later.
// Linked from the Migrations page so admins export before the "Clear nutrition data" wipe.
export async function GET() {
  await requireAdmin();

  const meals = await getAllMeals();
  const lines: string[] = [];
  const json: unknown[] = [];

  lines.push(`Michi Snackie Plan — meals export`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total meals: ${meals.length}`);
  lines.push('='.repeat(60));
  lines.push('');

  for (const meal of meals) {
    const ingredients = await getMealIngredients(meal.id);
    const nutrition = computeNutrition(ingredients);

    lines.push(`${meal.emoji ? meal.emoji + ' ' : ''}${meal.name}  [${meal.status}]`);
    if (meal.description) lines.push(`  ${meal.description}`);
    lines.push(`  slots: ${meal.mealSlotAllowed.join(', ') || '—'}`);
    lines.push(`  category: ${meal.category} · protein: ${meal.mainProtein} (${meal.proteinGroup}) · carb: ${meal.carbBase}`);
    if (meal.totalWeightG != null) lines.push(`  total weight: ${meal.totalWeightG} g`);
    lines.push(
      `  nutrition${nutrition.approximate ? ' (approx)' : ''}: ${nutrition.calories} kcal · ` +
        `P ${nutrition.proteinG}g · C ${nutrition.carbsG}g · F ${nutrition.fatG}g`,
    );
    lines.push('  ingredients:');
    for (const mi of ingredients) {
      lines.push(`    - ${mi.ingredient?.name ?? mi.ingredientId}: ${mi.quantity} ${mi.unit}`);
    }
    lines.push('');

    json.push({
      name: meal.name,
      description: meal.description,
      emoji: meal.emoji,
      status: meal.status,
      mealSlotAllowed: meal.mealSlotAllowed,
      category: meal.category,
      mainProtein: meal.mainProtein,
      proteinGroup: meal.proteinGroup,
      carbBase: meal.carbBase,
      mealStyle: meal.mealStyle,
      fruitOrVeg: meal.fruitOrVeg,
      tags: meal.tags,
      totalWeightG: meal.totalWeightG ?? null,
      nutrition,
      ingredients: ingredients.map((mi) => ({
        name: mi.ingredient?.name ?? null,
        ingredientId: mi.ingredientId,
        quantity: mi.quantity,
        unit: mi.unit,
      })),
    });
  }

  lines.push('='.repeat(60));
  lines.push('JSON (machine-readable, for re-import):');
  lines.push(JSON.stringify(json, null, 2));

  const body = lines.join('\n');
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="michi-meals-export-${stamp}.txt"`,
    },
  });
}
