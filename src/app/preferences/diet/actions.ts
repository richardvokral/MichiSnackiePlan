'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { setUserDietPreferences, getUserDietPreferences } from '@/lib/repository';
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

// Imports a not-signed-in user's localStorage diet prefs into their account on
// first sign-in. Only writes when the account has none, so it never clobbers
// preferences already saved server-side.
export async function importDietPreferencesAction(prefs: {
  dietType: string | null;
  allergies: string[];
}): Promise<{ imported: boolean }> {
  const user = await requireUser();

  const existing = await getUserDietPreferences(user.id);
  if (existing && (existing.dietType || existing.allergies.length > 0)) {
    return { imported: false };
  }

  const result = prefsSchema.safeParse({
    dietType: prefs.dietType ?? null,
    allergies: (prefs.allergies ?? []).filter((a) => (ALLERGENS as readonly string[]).includes(a)),
  });
  if (!result.success) return { imported: false };

  await setUserDietPreferences(user.id, result.data);
  revalidatePath('/');
  return { imported: true };
}
