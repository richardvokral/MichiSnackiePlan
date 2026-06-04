import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { listUserMeals } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export default async function MyMealsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');

  const meals = await listUserMeals(user.id);

  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      <div className="mx-auto max-w-lg px-5 pt-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-700">
            ‹ Back
          </Link>
          <span className="text-sm font-semibold text-purple-700">My meals</span>
          <div className="w-10" />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-800">My meals</h1>
          <Link
            href="/meals/new"
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          >
            + New
          </Link>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Meals you create are private to you and show up alongside the catalog when you plan.
        </p>

        <div className="mt-6 space-y-2">
          {meals.map((meal) => (
            <Link
              key={meal.id}
              href={`/meal/${meal.id}`}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="text-2xl">{meal.emoji || '🍽️'}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-800">{meal.name}</p>
                <p className="truncate text-sm text-neutral-400">{meal.description}</p>
              </div>
            </Link>
          ))}
          {meals.length === 0 && (
            <p className="py-12 text-center text-neutral-400">
              No meals yet. Tap <span className="font-semibold">+ New</span> to make one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
