'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { addFavorite, removeFavorite } from '@/lib/repository';

export async function toggleFavoriteAction(
  mealId: string,
  favorited: boolean,
): Promise<{ favorited: boolean }> {
  const user = await requireUser();
  if (favorited) {
    await addFavorite(user.id, mealId);
  } else {
    await removeFavorite(user.id, mealId);
  }
  revalidatePath('/preferences/favorites');
  return { favorited };
}
