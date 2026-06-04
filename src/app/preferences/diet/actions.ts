'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { setUserDietPreferences } from '@/lib/repository';
import { DIET_TYPES, ALLERGENS } from '@/lib/diet';
import { z } from 'zod/v4';

const prefsSchema = z.object({
  dietType: z.enum(DIET_TYPES).nullable(),
  allergies: z.array(z.enum(ALLERGENS)).default([]),
});

export async function saveDietPreferencesAction(formData: FormData) {
  const user = await requireUser();
  const rawDiet = (formData.get('dietType') as string) || '';
  const allergies = formData.getAll('allergies').map(String);

  const parsed = prefsSchema.parse({
    dietType: rawDiet === '' ? null : rawDiet,
    allergies,
  });

  await setUserDietPreferences(user.id, parsed);
  revalidatePath('/');
  revalidatePath('/preferences/diet');
  redirect('/');
}
