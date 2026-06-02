'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import {
  createMeal,
  updateMeal,
  setMealStatus,
  updateRecommendationConfig,
  addAdmin,
  removeAdmin,
} from '@/lib/repository';
import { mealInputSchema } from '@/lib/repository/meals';
import { RecommendationConfig } from '@/lib/recommendationConfig';
import { MealCatalogStatus } from '@/lib/types';
import { z } from 'zod/v4';

function formDataToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === 'string') obj[key] = value;
  });
  return obj;
}

function parseArrayField(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function createMealAction(formData: FormData) {
  await requireAdmin();

  const raw = formDataToObject(formData);
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
    status: (raw.status as MealCatalogStatus) || 'draft',
  });

  await createMeal(input);
  revalidatePath('/admin/meals');
  redirect('/admin/meals');
}

export async function updateMealAction(formData: FormData) {
  await requireAdmin();

  const id = formData.get('id') as string;
  const expectedUpdatedAt = formData.get('updatedAt') as string | null;
  const raw = formDataToObject(formData);

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
    status: raw.status || 'draft',
  });

  await updateMeal(id, input, expectedUpdatedAt || undefined);
  revalidatePath('/admin/meals');
  revalidatePath(`/admin/meals/${id}`);
  revalidatePath('/');
  redirect('/admin/meals');
}

export async function setMealStatusAction(formData: FormData) {
  await requireAdmin();

  const id = formData.get('id') as string;
  const status = formData.get('status') as MealCatalogStatus;

  await setMealStatus(id, status);
  revalidatePath('/admin/meals');
  revalidatePath('/');
}

export async function updateConfigAction(formData: FormData) {
  const admin = await requireAdmin();

  const config: RecommendationConfig = {
    baseScore: Number(formData.get('baseScore')) || 100,
    weights: {
      repeatCarbBasePenalty: Number(formData.get('repeatCarbBasePenalty')) || 0,
      tooMuchDairyPenalty: Number(formData.get('tooMuchDairyPenalty')) || 0,
      tooMuchBreadPenalty: Number(formData.get('tooMuchBreadPenalty')) || 0,
      sameStyleAsPrevPenalty: Number(formData.get('sameStyleAsPrevPenalty')) || 0,
      alternatingSweetSavoryReward: Number(formData.get('alternatingSweetSavoryReward')) || 0,
      newCategoryReward: Number(formData.get('newCategoryReward')) || 0,
      crossDayRepeatPenalty: Number(formData.get('crossDayRepeatPenalty')) || 0,
    },
    thresholds: {
      dairyCountThreshold: Number(formData.get('dairyCountThreshold')) || 2,
      breadCountThreshold: Number(formData.get('breadCountThreshold')) || 2,
      crossDayLookbackDays: Number(formData.get('crossDayLookbackDays')) || 2,
    },
    rules: {
      noExactRepeat: formData.get('noExactRepeat') === 'on',
      noSameMainProteinAsPrev: formData.get('noSameMainProteinAsPrev') === 'on',
      noSameProteinGroupAsPrev: formData.get('noSameProteinGroupAsPrev') === 'on',
      noSameCategoryAsPrev: formData.get('noSameCategoryAsPrev') === 'on',
      lunchDinnerRequireVeg: formData.get('lunchDinnerRequireVeg') === 'on',
      crossDayVarietyEnabled: formData.get('crossDayVarietyEnabled') === 'on',
    },
  };

  await updateRecommendationConfig(config, admin.email ?? undefined);
  revalidatePath('/admin/config');
  revalidatePath('/');
}

const emailSchema = z.email();

export async function addAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const email = emailSchema.parse(formData.get('email'));
  await addAdmin(email, admin.email ?? 'system');
  revalidatePath('/admin/admins');
}

export async function removeAdminAction(formData: FormData) {
  await requireAdmin();
  const email = formData.get('email') as string;
  const firstAdmin = process.env.FIRST_ADMIN_EMAIL;
  if (firstAdmin && email.toLowerCase() === firstAdmin.toLowerCase()) {
    throw new Error('Cannot remove the bootstrap admin');
  }
  await removeAdmin(email);
  revalidatePath('/admin/admins');
}
