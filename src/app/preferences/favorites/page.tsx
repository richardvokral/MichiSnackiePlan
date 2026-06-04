import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getPublishedMealsForUser, getUserFavoriteIds } from '@/lib/repository';
import FavoritesClient from './FavoritesClient';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');

  const [meals, favoriteIds] = await Promise.all([
    getPublishedMealsForUser(user.id),
    getUserFavoriteIds(user.id),
  ]);

  const foods = meals.map((m) => ({
    id: m.id,
    name: m.name,
    emoji: m.emoji,
    description: m.description,
  }));

  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      <div className="mx-auto max-w-lg px-5 pt-6">
        <div className="flex items-center justify-between">
          <Link href="/preferences" className="text-sm text-neutral-500 hover:text-neutral-700">
            ‹ Back
          </Link>
          <span className="text-sm font-semibold text-purple-700">Favorites</span>
          <div className="w-10" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-neutral-800">Favorite foods</h1>
        <p className="mt-1 mb-5 text-sm text-neutral-500">
          Search the catalog and tap the heart to favorite a food.
        </p>

        <FavoritesClient meals={foods} favoriteIds={favoriteIds} />
      </div>
    </div>
  );
}
