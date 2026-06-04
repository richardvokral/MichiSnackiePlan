import { listIngredients } from '@/lib/repository';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminIngredientsPage() {
  const ingredients = await listIngredients();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">Ingredients</h1>
        <Link
          href="/admin/ingredients/new"
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
        >
          + New Ingredient
        </Link>
      </div>

      <p className="mt-2 text-sm text-neutral-500">
        Nutrition is per 100g. Allergens and diet here flow into each meal&apos;s effective
        allergen/diet info (unless a meal overrides them).
      </p>

      <div className="mt-6 space-y-2">
        {ingredients.map((ing) => (
          <div key={ing.id} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
            <div className="min-w-0 flex-1">
              <Link
                href={`/admin/ingredients/${ing.id}`}
                className="font-semibold text-neutral-800 hover:text-purple-600"
              >
                {ing.name}
              </Link>
              <p className="truncate text-xs text-neutral-400">
                {ing.calories != null ? `${ing.calories} kcal` : 'no kcal'} ·{' '}
                {ing.dietType ?? 'diet unspecified'}
                {ing.allergens.length > 0 ? ` · ${ing.allergens.join(', ')}` : ''}
              </p>
            </div>
          </div>
        ))}
        {ingredients.length === 0 && (
          <p className="py-12 text-center text-neutral-400">No ingredients yet.</p>
        )}
      </div>
    </div>
  );
}
