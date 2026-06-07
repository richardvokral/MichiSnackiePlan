'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createArchetype, updateArchetype, deleteArchetype, getArchetype } from '@/lib/repository';

function str(v: FormDataEntryValue | null): string {
  return typeof v === 'string' ? v.trim() : '';
}

export async function createArchetypeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = str(formData.get('name'));
  if (!name) return;
  await createArchetype({
    name,
    slotHint: str(formData.get('slotHint')) || null,
    description: str(formData.get('description')),
    example: str(formData.get('example')),
  });
  revalidatePath('/admin/ai/archetypes');
}

export async function updateArchetypeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData.get('id'));
  if (!id) return;
  await updateArchetype(id, {
    name: str(formData.get('name')),
    slotHint: str(formData.get('slotHint')) || null,
    description: str(formData.get('description')),
    example: str(formData.get('example')),
  });
  revalidatePath('/admin/ai/archetypes');
}

export async function toggleArchetypeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData.get('id'));
  if (!id) return;
  const current = await getArchetype(id);
  if (!current) return;
  await updateArchetype(id, { enabled: !current.enabled });
  revalidatePath('/admin/ai/archetypes');
}

export async function deleteArchetypeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData.get('id'));
  if (!id) return;
  await deleteArchetype(id);
  revalidatePath('/admin/ai/archetypes');
}
