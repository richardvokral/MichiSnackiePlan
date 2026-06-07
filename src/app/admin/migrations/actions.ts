'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { runAndVerifyMigrations, resetGeneratedData } from '@/lib/repository';
import { MigrationReport } from '@/lib/migrationTypes';

export async function runMigrationsAction(): Promise<MigrationReport> {
  await requireAdmin();
  const report = await runAndVerifyMigrations();
  // Refresh the page's read-only status list after applying.
  revalidatePath('/admin/migrations');
  return report;
}

// Destructive: wipes generated catalog data so the pipeline can re-seed from scratch.
// Gated by a typed CLEAR confirmation. Keeps meal_archetypes.
export async function clearNutritionDataAction(
  confirm: string,
): Promise<{ ok: boolean; message: string; deleted?: Record<string, number> }> {
  await requireAdmin();
  if (confirm.trim() !== 'CLEAR') {
    return { ok: false, message: 'Type CLEAR to confirm.' };
  }
  const deleted = await resetGeneratedData();
  revalidatePath('/admin/migrations');
  revalidatePath('/admin/ai');
  revalidatePath('/admin/ingredients');
  revalidatePath('/admin/meals');
  revalidatePath('/');
  return { ok: true, message: 'Generated catalog data cleared.', deleted };
}
