'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { runAndVerifyMigrations } from '@/lib/repository';
import { MigrationReport } from '@/lib/migrationTypes';

export async function runMigrationsAction(): Promise<MigrationReport> {
  await requireAdmin();
  const report = await runAndVerifyMigrations();
  // Refresh the page's read-only status list after applying.
  revalidatePath('/admin/migrations');
  return report;
}
