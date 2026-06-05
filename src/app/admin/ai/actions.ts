'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import {
  createAiJob,
  getAiJob,
  updateAiJobProgress,
  addIngredientCandidates,
  getAnyPendingCandidates,
  countAllPendingCandidates,
  getJobCandidateNames,
  markCandidate,
  listIngredients,
  getPublishedIngredients,
  getIngredientByName,
  createIngredientDraft,
  countUnreviewedDraftIngredients,
  getUnreviewedDraftIngredients,
  applyIngredientReview,
  getAllMeals,
  createMeal,
  setMealIngredients,
  updateAiConfig,
} from '@/lib/repository';
import type { AiJob } from '@/lib/repository/aiJobs';
import { generateIngredientNames, generateMeals, reviewIngredients } from '@/lib/ai/generate';
import { resolveUsdaIngredient, UsdaError } from '@/lib/usda';
import { checkMealWeight } from '@/lib/mealValidation';
import { isDietType, DietType } from '@/lib/diet';
import { BatchProgress } from '@/lib/ai/batchTypes';
import { getAiProvider } from '@/lib/ai/provider';
import { z } from 'zod/v4';

const BATCH_SIZE = 10;

function toProgress(job: AiJob): BatchProgress {
  return {
    jobId: job.id,
    type: job.type,
    status: job.status,
    processed: job.processedCount,
    target: job.targetCount,
    created: job.createdCount,
    errors: job.errorCount,
    done: job.status === 'done',
    lastError: job.lastError,
  };
}

// ---- Start actions ----

export async function startIngredientNamesJob(target: number): Promise<BatchProgress> {
  const admin = await requireAdmin();
  const t = Math.max(1, Math.min(2000, Math.floor(target) || 0));
  const job = await createAiJob('ingredient_names', t, {}, admin.email ?? undefined);
  return toProgress(job);
}

export async function startIngredientUsdaJob(): Promise<BatchProgress> {
  const admin = await requireAdmin();
  const pending = await countAllPendingCandidates();
  const job = await createAiJob('ingredient_usda', pending, {}, admin.email ?? undefined);
  return toProgress(job);
}

export async function startMealsJob(target: number): Promise<BatchProgress> {
  const admin = await requireAdmin();
  const t = Math.max(1, Math.min(500, Math.floor(target) || 0));
  const job = await createAiJob('meals', t, {}, admin.email ?? undefined);
  return toProgress(job);
}

export async function startIngredientReviewJob(): Promise<BatchProgress> {
  const admin = await requireAdmin();
  const pending = await countUnreviewedDraftIngredients();
  const job = await createAiJob('ingredient_review', pending, {}, admin.email ?? undefined);
  return toProgress(job);
}

// ---- Incremental processing: one batch of <=10 per call ----

export async function processNextBatch(jobId: string): Promise<BatchProgress> {
  await requireAdmin();
  const job = await getAiJob(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status === 'done') return toProgress(job);

  try {
    let updated: AiJob;
    if (job.type === 'ingredient_names') updated = await runIngredientNamesBatch(job);
    else if (job.type === 'ingredient_usda') updated = await runIngredientUsdaBatch(job);
    else if (job.type === 'ingredient_review') updated = await runIngredientReviewBatch(job);
    else updated = await runMealsBatch(job);
    revalidatePath('/admin/ingredients');
    revalidatePath('/admin/meals');
    revalidatePath('/admin/ai');
    return toProgress(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const updated = await updateAiJobProgress(jobId, { status: 'error', lastError: msg });
    return toProgress(updated);
  }
}

async function runIngredientNamesBatch(job: AiJob): Promise<AiJob> {
  const remaining = job.targetCount - job.processedCount;
  if (remaining <= 0) return updateAiJobProgress(job.id, { status: 'done' });

  const batch = Math.min(BATCH_SIZE, remaining);
  const existingNames = (await listIngredients()).map((i) => i.name);
  const jobNames = await getJobCandidateNames(job.id);
  const seed = Array.from(new Set([...existingNames, ...jobNames])).slice(0, 500);

  const generated = await generateIngredientNames(seed, batch);
  await addIngredientCandidates(
    job.id,
    generated.map((g) => ({ name: g.name, allergens: g.allergens, dietType: g.dietType })),
  );

  const processed = job.processedCount + (generated.length || batch);
  const created = job.createdCount + generated.length;
  const status = processed >= job.targetCount ? 'done' : 'running';
  return updateAiJobProgress(job.id, { processedCount: processed, createdCount: created, status });
}

async function runIngredientUsdaBatch(job: AiJob): Promise<AiJob> {
  const candidates = await getAnyPendingCandidates(BATCH_SIZE);
  if (candidates.length === 0) return updateAiJobProgress(job.id, { status: 'done' });

  let processed = job.processedCount;
  let created = job.createdCount;
  let errors = job.errorCount;

  for (const c of candidates) {
    try {
      // Skip duplicates already in the catalog.
      const existing = await getIngredientByName(c.name);
      if (existing) {
        await markCandidate(c.id, 'skipped', existing.id);
        processed += 1;
        continue;
      }

      const resolved = await resolveUsdaIngredient(c.name);
      const ing = await createIngredientDraft({
        name: resolved?.name ?? c.name,
        calories: resolved?.nutrition.calories ?? null,
        proteinG: resolved?.nutrition.proteinG ?? null,
        carbsG: resolved?.nutrition.carbsG ?? null,
        fatG: resolved?.nutrition.fatG ?? null,
        allergens: c.allergens,
        dietType: isDietType(c.dietType) ? (c.dietType as DietType) : null,
        usdaFdcId: resolved?.usdaFdcId ?? null,
        source: resolved ? 'usda' : 'ai',
      });
      await markCandidate(c.id, 'loaded', ing.id);
      created += 1;
      processed += 1;
    } catch (e) {
      // Rate-limited / transient USDA failures: stop the batch and leave the
      // candidate pending so the job can resume later (esp. the ~1000/hr limit).
      if (e instanceof UsdaError && e.retryable) {
        await updateAiJobProgress(job.id, { processedCount: processed, createdCount: created, errorCount: errors });
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      await markCandidate(c.id, 'error', undefined, msg);
      errors += 1;
      processed += 1;
    }
  }

  const remaining = await countAllPendingCandidates();
  const status = remaining === 0 ? 'done' : 'running';
  return updateAiJobProgress(job.id, { processedCount: processed, createdCount: created, errorCount: errors, status });
}

async function runIngredientReviewBatch(job: AiJob): Promise<AiJob> {
  const drafts = await getUnreviewedDraftIngredients(BATCH_SIZE);
  if (drafts.length === 0) return updateAiJobProgress(job.id, { status: 'done' });

  const suggestions = await reviewIngredients(
    drafts.map((d) => ({
      id: d.id,
      name: d.name,
      calories: d.calories,
      proteinG: d.proteinG,
      carbsG: d.carbsG,
      fatG: d.fatG,
      allergens: d.allergens,
      dietType: d.dietType,
    })),
  );
  const byId = new Map(suggestions.map((s) => [s.id, s]));

  let processed = job.processedCount;
  let created = job.createdCount; // here: ingredients reviewed/updated
  let errors = job.errorCount;

  for (const d of drafts) {
    const s = byId.get(d.id);
    if (!s) {
      // Still stamp a note so this draft leaves the queue (avoids re-looping).
      await applyIngredientReview(d.id, {
        calories: d.calories,
        proteinG: d.proteinG,
        carbsG: d.carbsG,
        fatG: d.fatG,
        allergens: d.allergens,
        dietType: isDietType(d.dietType) ? (d.dietType as DietType) : null,
        reviewNote: 'Not reviewed by AI (no suggestion returned).',
      });
      errors += 1;
      processed += 1;
      continue;
    }
    // Fill only MISSING fields (don't overwrite good USDA data); always record the note.
    const dietType = isDietType(d.dietType)
      ? (d.dietType as DietType)
      : isDietType(s.dietType)
        ? (s.dietType as DietType)
        : null;
    await applyIngredientReview(d.id, {
      calories: d.calories ?? s.calories,
      proteinG: d.proteinG ?? s.proteinG,
      carbsG: d.carbsG ?? s.carbsG,
      fatG: d.fatG ?? s.fatG,
      allergens: d.allergens.length > 0 ? d.allergens : s.allergens,
      dietType,
      reviewNote: s.note || (s.ok ? 'Reviewed — complete and plausible.' : 'Reviewed.'),
    });
    created += 1;
    processed += 1;
  }

  const remaining = await countUnreviewedDraftIngredients();
  const status = remaining === 0 ? 'done' : 'running';
  return updateAiJobProgress(job.id, { processedCount: processed, createdCount: created, errorCount: errors, status });
}

async function runMealsBatch(job: AiJob): Promise<AiJob> {
  const remaining = job.targetCount - job.processedCount;
  if (remaining <= 0) return updateAiJobProgress(job.id, { status: 'done' });

  const batch = Math.min(BATCH_SIZE, remaining);
  const published = await getPublishedIngredients();
  if (published.length === 0) {
    throw new Error('No published ingredients available. Publish some ingredients before generating foods.');
  }
  // Constrain generation to published names; map back to ids strictly (drop anything not published).
  const publishedByName = new Map(published.map((i) => [i.name.toLowerCase(), i]));
  const ingNames = published.map((i) => i.name).slice(0, 400);
  const existingMealNames = (await getAllMeals()).map((m) => m.name).slice(0, 400);
  const meals = await generateMeals({ names: existingMealNames, ingredientNames: ingNames }, batch);

  let created = job.createdCount;
  let errors = job.errorCount;
  let lastError: string | null = null;

  for (const m of meals) {
    const check = checkMealWeight(
      m.ingredients.map((i) => ({ quantity: i.quantityG, unit: 'g' })),
      m.totalWeightG,
    );
    if (!check.ok) {
      errors += 1;
      lastError = `${m.name}: ingredient weight ${check.sumG}g exceeds total ${check.totalG}g — skipped`;
      continue;
    }

    // Strictly map ingredient names → existing PUBLISHED ingredients; drop unknowns.
    const rows: { ingredientId: string; quantity: number; unit: string }[] = [];
    for (const ing of m.ingredients) {
      const match = publishedByName.get(ing.name.toLowerCase());
      if (!match) continue;
      rows.push({ ingredientId: match.id, quantity: ing.quantityG, unit: 'g' });
    }
    if (rows.length === 0) {
      errors += 1;
      lastError = `${m.name}: no valid published ingredients — skipped`;
      continue;
    }

    const createdMeal = await createMeal({
      name: m.name,
      description: m.description,
      mealSlotAllowed: m.mealSlotAllowed,
      category: m.category,
      mainProtein: m.mainProtein,
      proteinGroup: m.proteinGroup,
      carbBase: m.carbBase,
      mealStyle: m.mealStyle,
      fruitOrVeg: m.fruitOrVeg,
      tags: [],
      emoji: m.emoji,
      imageUrl: null,
      status: 'draft',
      dietType: null,
      allergens: [],
      allergensOverride: false,
      totalWeightG: m.totalWeightG,
    });
    await setMealIngredients(createdMeal.id, rows);
    created += 1;
  }

  const processed = job.processedCount + meals.length;
  const status = processed >= job.targetCount ? 'done' : 'running';
  return updateAiJobProgress(job.id, { processedCount: processed, createdCount: created, errorCount: errors, status, lastError });
}

// ---- AI settings ----

export async function updateAiSettingsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const provider = (formData.get('provider') as string) || 'anthropic';
  const model = ((formData.get('model') as string) || '').trim() || 'claude-opus-4-8';
  await updateAiConfig({ provider, model }, admin.email ?? undefined);
  revalidatePath('/admin/ai/settings');
  revalidatePath('/admin/ai');
}

// Tiny round-trip to verify the API key + model are reachable.
export async function testAiConnectionAction(): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  try {
    const { provider, settings } = await getAiProvider();
    const result = await provider.generateJson({
      system: 'You are a connection tester.',
      prompt: 'Return the word "ok".',
      schema: z.object({ status: z.string() }),
      schemaName: 'emit_status',
      model: settings.model,
      maxTokens: 64,
    });
    return { ok: true, message: `Connected to ${settings.provider}/${settings.model} (replied: ${result.status}).` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
