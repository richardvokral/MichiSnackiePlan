import { listIngredients } from '@/lib/repository';
import { setIngredientStatusAction } from './actions';
import { IngredientStatus } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    published: 'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-700',
    inactive: 'bg-neutral-100 text-neutral-500',
  };
  return colors[status] || 'bg-neutral-100 text-neutral-500';
};

export default async function AdminIngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter } = await searchParams;
  const validStatuses: IngredientStatus[] = ['draft', 'published', 'inactive'];
  const filter = validStatuses.includes(statusFilter as IngredientStatus)
    ? (statusFilter as IngredientStatus)
    : undefined;

  const ingredients = await listIngredients(filter);

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
        allergen/diet info (unless a meal overrides them). Only <strong>published</strong> ingredients
        are selectable when building meals.
      </p>

      <div className="mt-4 flex gap-2">
        <Link href="/admin/ingredients" className={`rounded-full px-3 py-1 text-xs font-medium ${!filter ? 'bg-purple-100 text-purple-700' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}>
          All
        </Link>
        {validStatuses.map((s) => (
          <Link key={s} href={`/admin/ingredients?status=${s}`} className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${filter === s ? 'bg-purple-100 text-purple-700' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}>
            {s}
          </Link>
        ))}
      </div>

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
                {ing.source !== 'manual' ? ` · ${ing.source}` : ''}
                {ing.usdaFdcId ? ` · USDA ${ing.usdaFdcId}` : ''}
              </p>
              {ing.reviewNote && (
                <p className="mt-0.5 truncate text-xs text-purple-500">AI review: {ing.reviewNote}</p>
              )}
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(ing.status)}`}>
              {ing.status}
            </span>
            <div className="flex gap-1">
              {ing.status !== 'published' && (
                <form action={setIngredientStatusAction}>
                  <input type="hidden" name="id" value={ing.id} />
                  <input type="hidden" name="status" value="published" />
                  <button type="submit" className="rounded px-2 py-1 text-xs text-green-600 hover:bg-green-50">
                    Publish
                  </button>
                </form>
              )}
              {ing.status === 'published' && (
                <form action={setIngredientStatusAction}>
                  <input type="hidden" name="id" value={ing.id} />
                  <input type="hidden" name="status" value="inactive" />
                  <button type="submit" className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100">
                    Deactivate
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {ingredients.length === 0 && (
          <p className="py-12 text-center text-neutral-400">No ingredients found.</p>
        )}
      </div>
    </div>
  );
}
