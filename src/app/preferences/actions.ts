'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { setUserPreference, removeUserPreference } from '@/lib/repository';
import { MealSlotId, SLOT_ORDER } from '@/lib/types';

export async function savePreferenceAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const slot = formData.get('slot') as MealSlotId;
  const mealId = formData.get('mealId') as string;

  if (!SLOT_ORDER.includes(slot)) throw new Error('Invalid slot');

  if (!mealId) {
    await removeUserPreference(user.id, slot);
  } else {
    await setUserPreference(user.id, slot, mealId);
  }
  revalidatePath('/preferences');
}
