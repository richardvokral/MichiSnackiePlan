'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { setUserGoals } from '@/lib/repository';
import { GOAL_LIMITS, NO_GOALS } from '@/lib/goals';
import { z } from 'zod/v4';

const goalsSchema = z.object({
  targetKcal: z.number().int().min(GOAL_LIMITS.kcal.min).max(GOAL_LIMITS.kcal.max).nullable(),
  targetProteinG: z.number().int().min(GOAL_LIMITS.proteinG.min).max(GOAL_LIMITS.proteinG.max).nullable(),
});

function parseOptionalInt(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function saveGoalsAction(formData: FormData) {
  const user = await requireUser();
  const parsed = goalsSchema.parse({
    targetKcal: parseOptionalInt(formData.get('targetKcal')),
    targetProteinG: parseOptionalInt(formData.get('targetProteinG')),
  });
  await setUserGoals(user.id, parsed);
  revalidatePath('/');
  revalidatePath('/preferences/goals');
  redirect('/');
}

// Goals are optional — clearing them returns the app to plain day totals.
export async function clearGoalsAction() {
  const user = await requireUser();
  await setUserGoals(user.id, NO_GOALS);
  revalidatePath('/');
  revalidatePath('/preferences/goals');
  redirect('/');
}
