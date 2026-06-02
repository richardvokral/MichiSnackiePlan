import { getAllMeals } from '@/lib/repository';
import { setMealStatusAction } from '@/app/admin/actions';
import Link from 'next/link';
import { MealCatalogStatus } from '@/lib/types';

export default async function AdminMealsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter } = await searchParams;
  const validStatuses: MealCatalogStatus[] = ['draft', 'published', 'inactive'];
  const filter = validStatuses.includes(statusFilter as MealCatalogStatus)
    ? (statusFilter as MealCatalogStatus)
    : undefined;

  const meals = await getAllMeals(filter);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      published: 'bg-green-100 text-green-700',
      draft: 'bg-yellow-100 text-yellow-700',
      inactive: 'bg-neutral-100 text-neutral-500',
    };
    return colors[status] || 'bg-neutral-100 text-neutral-500';
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">Meals</h1>
        <Link
          href="/admin/meals/new"
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
        >
          + New Meal
        </Link>
      </div>

      <div className="mt-4 flex gap-2">
        <Link href="/admin/meals" className={`rounded-full px-3 py-1 text-xs font-medium ${!filter ? 'bg-purple-100 text-purple-700' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}>
          All
        </Link>
        {validStatuses.map((s) => (
          <Link key={s} href={`/admin/meals?status=${s}`} className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${filter === s ? 'bg-purple-100 text-purple-700' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}>
            {s}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        {meals.map((meal) => (
          <div key={meal.id} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
            <span className="text-2xl">{meal.emoji}</span>
            <div className="flex-1 min-w-0">
              <Link href={`/admin/meals/${meal.id}`} className="font-semibold text-neutral-800 hover:text-purple-600">
                {meal.name}
              </Link>
              <p className="truncate text-sm text-neutral-400">{meal.description}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(meal.status)}`}>
              {meal.status}
            </span>
            <div className="flex gap-1">
              {meal.status !== 'published' && (
                <form action={setMealStatusAction}>
                  <input type="hidden" name="id" value={meal.id} />
                  <input type="hidden" name="status" value="published" />
                  <button type="submit" className="rounded px-2 py-1 text-xs text-green-600 hover:bg-green-50">
                    Publish
                  </button>
                </form>
              )}
              {meal.status === 'published' && (
                <form action={setMealStatusAction}>
                  <input type="hidden" name="id" value={meal.id} />
                  <input type="hidden" name="status" value="inactive" />
                  <button type="submit" className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100">
                    Deactivate
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {meals.length === 0 && (
          <p className="py-12 text-center text-neutral-400">No meals found.</p>
        )}
      </div>
    </div>
  );
}
