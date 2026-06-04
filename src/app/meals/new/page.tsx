import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { listIngredients } from '@/lib/repository';
import MealForm from '@/app/admin/meals/MealForm';
import { createUserMealAction } from '@/app/meals/actions';

export const dynamic = 'force-dynamic';

export default async function NewUserMealPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');

  const allIngredients = await listIngredients();

  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      <div className="mx-auto max-w-2xl px-5 pt-6">
        <div className="flex items-center justify-between">
          <Link href="/meals" className="text-sm text-neutral-500 hover:text-neutral-700">
            ‹ My meals
          </Link>
          <span className="text-sm font-semibold text-purple-700">Make your own meal</span>
          <div className="w-16" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-neutral-800">Create your meal</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Only you will see this meal when you plan your day.
        </p>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <MealForm
            action={createUserMealAction}
            submitLabel="Create my meal"
            allIngredients={allIngredients}
            hideStatus
          />
        </div>
      </div>
    </div>
  );
}
