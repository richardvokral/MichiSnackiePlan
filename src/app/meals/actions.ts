'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createUserMeal, setMealIngredients } from '@/lib/repository';
import { mealInputSchema } from '@/lib/repository/meals';
import { z } from 'zod/v4';

function parseArrayField(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

const mealIngredientsSchema = z.array(
  z.object({
    ingredientId: z.string().min(1),
    quantity: z.number().nonnegative(),
    unit: z.string().min(1).max(20),
  }),
);

function parseMealIngredients(json: string | undefined): { ingredientId: string; quantity: number; unit: string }[] {
  if (!json) return [];
  try {
    const result = mealIngredientsSchema.safeParse(JSON.parse(json));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export async function createUserMealAction(formData: FormData) {
  const user = await requireUser();

  const raw: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === 'string') raw[key] = value;
  });

  const input = mealInputSchema.parse({
    name: raw.name,
    description: raw.description,
    mealSlotAllowed: parseArrayField(raw.mealSlotAllowed),
    category: raw.category,
    mainProtein: raw.mainProtein,
    proteinGroup: raw.proteinGroup,
    carbBase: raw.carbBase,
    mealStyle: parseArrayField(raw.mealStyle),
    fruitOrVeg: raw.fruitOrVeg,
    tags: parseArrayField(raw.tags),
    emoji: raw.emoji || '',
    imageUrl: raw.imageUrl || null,
    status: 'published',
    dietType: raw.dietType || null,
    allergens: parseArrayField(raw.allergens),
    allergensOverride: raw.allergensOverride === 'on',
  });

  const created = await createUserMeal(user.id, input);
  await setMealIngredients(created.id, parseMealIngredients(raw.mealIngredientsJson));
  revalidatePath('/');
  redirect('/meals');
}
