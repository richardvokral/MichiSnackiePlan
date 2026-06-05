'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import {
  createIngredient,
  updateIngredient,
  deleteIngredient,
  setIngredientStatus,
} from '@/lib/repository';
import { ingredientInputSchema } from '@/lib/repository/ingredients';
import { IngredientStatus } from '@/lib/types';

function parseArrayField(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function numOrNull(value: FormDataEntryValue | null): number | null {
  const s = typeof value === 'string' ? value.trim() : '';
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseForm(formData: FormData) {
  return ingredientInputSchema.parse({
    name: formData.get('name'),
    calories: numOrNull(formData.get('calories')),
    proteinG: numOrNull(formData.get('proteinG')),
    carbsG: numOrNull(formData.get('carbsG')),
    fatG: numOrNull(formData.get('fatG')),
    allergens: parseArrayField(formData.get('allergens') as string),
    dietType: (formData.get('dietType') as string) || null,
    usdaFdcId: (formData.get('usdaFdcId') as string) || null,
    status: (formData.get('status') as string) || 'draft',
    source: (formData.get('source') as string) || 'manual',
  });
}

export async function createIngredientAction(formData: FormData) {
  await requireAdmin();
  await createIngredient(parseForm(formData));
  revalidatePath('/admin/ingredients');
  redirect('/admin/ingredients');
}

export async function updateIngredientAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get('id') as string;
  await updateIngredient(id, parseForm(formData));
  revalidatePath('/admin/ingredients');
  revalidatePath('/'); // a meal's effective allergens/diet may change with the ingredient
  redirect('/admin/ingredients');
}

export async function deleteIngredientAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get('id') as string;
  await deleteIngredient(id);
  revalidatePath('/admin/ingredients');
  redirect('/admin/ingredients');
}

export async function setIngredientStatusAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get('id') as string;
  const status = formData.get('status') as IngredientStatus;
  await setIngredientStatus(id, status);
  revalidatePath('/admin/ingredients');
  revalidatePath('/'); // publishing/unpublishing changes what's selectable in meal builders
}
