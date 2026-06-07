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
  getPendingCandidateNames,
  markCandidate,
  getIngredientByName,
  getExistingIngredientNamesLower,
  createIngredientDraft,
  publishReviewedIngredientsWithNutrition,
  countUnreviewedDraftIngredients,
  getUnreviewedDraftIngredients,
  applyIngredientReview,
  createMeal,
  setMealIngredients,
  updateAiConfig,
  listArchetypes,
  getArchetypeNames,
  countArchetypes,
  upsertArchetypeByName,
  createGeneratedMeal,
  getCardCountsByArchetype,
  getPendingGeneratedMeals,
  countGeneratedMealsByStatus,
  getAllPendingIngredientNames,
  markGeneratedMealFinalized,
  markGeneratedMealRejected,
  getMealValidationConfig,
} from '@/lib/repository';
import type { AiJob } from '@/lib/repository/aiJobs';
import type { MealArchetype } from '@/lib/repository/archetypes';
import { generateArchetypes, generateMealVariants, reviewIngredients } from '@/lib/ai/generate';
import { resolveUsdaIngredient, UsdaError } from '@/lib/usda';
import { checkMealWeight } from '@/lib/mealValidation';
import { computeNutrition } from '@/lib/nutrition';
import { validateMealForSlot, isSlotBucket, SlotBucket } from '@/lib/mealValidationConfig';
import { isDietType, DietType } from '@/lib/diet';
import { MealIngredient } from '@/lib/types';
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

export async function startArchetypesJob(target: number): Promise<BatchProgress> {
  const admin = await requireAdmin();
  const t = Math.max(1, Math.min(100, Math.floor(target) || 30));
  const job = await createAiJob('archetypes', t, {}, admin.email ?? undefined);
  return toProgress(job);
}

export async function startMealVariantsJob(perArchetype: number): Promise<BatchProgress> {
  const admin = await requireAdmin();
  const per = Math.max(1, Math.min(20, Math.floor(perArchetype) || 5));
  const enabled = (await listArchetypes(true)).length;
  const job = await createAiJob('meal_variants', enabled * per, { perArchetype: per }, admin.email ?? undefined);
  return toProgress(job);
}

export async function startExtractIngredientsJob(): Promise<BatchProgress> {
  const admin = await requireAdmin();
  const names = await getAllPendingIngredientNames();
  const job = await createAiJob('extract_ingredients', names.length, {}, admin.email ?? undefined);
  return toProgress(job);
}

export async function startIngredientUsdaJob(): Promise<BatchProgress> {
  const admin = await requireAdmin();
  const pending = await countAllPendingCandidates();
  const job = await createAiJob('ingredient_usda', pending, {}, admin.email ?? undefined);
  return toProgress(job);
}

export async function startIngredientReviewJob(): Promise<BatchProgress> {
  const admin = await requireAdmin();
  const pending = await countUnreviewedDraftIngredients();
  const job = await createAiJob('ingredient_review', pending, {}, admin.email ?? undefined);
  return toProgress(job);
}

export async function startFinalizeMealsJob(): Promise<BatchProgress> {
  const admin = await requireAdmin();
  const pending = await countGeneratedMealsByStatus('pending');
  const job = await createAiJob('finalize_meals', pending, {}, admin.email ?? undefined);
  return toProgress(job);
}

// One-shot (not a batch job): publish reviewed drafts that have nutrition.
export async function publishIngredientsAction(): Promise<{ published: number }> {
  await requireAdmin();
  const published = await publishReviewedIngredientsWithNutrition();
  revalidatePath('/admin/ingredients');
  revalidatePath('/admin/ai');
  return { published };
}

// ---- Incremental processing: one batch per call ----

export async function processNextBatch(jobId: string): Promise<BatchProgress> {
  await requireAdmin();
  const job = await getAiJob(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status === 'done') return toProgress(job);

  try {
    let updated: AiJob;
    if (job.type === 'archetypes') updated = await runArchetypesBatch(job);
    else if (job.type === 'meal_variants') updated = await runMealVariantsBatch(job);
    else if (job.type === 'extract_ingredients') updated = await runExtractIngredientsBatch(job);
    else if (job.type === 'ingredient_usda') updated = await runIngredientUsdaBatch(job);
    else if (job.type === 'ingredient_review') updated = await runIngredientReviewBatch(job);
    else if (job.type === 'finalize_meals') updated = await runFinalizeMealsBatch(job);
    else throw new Error(`Unknown job type: ${job.type}`);
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

async function runArchetypesBatch(job: AiJob): Promise<AiJob> {
  if (job.processedCount >= job.targetCount || (await countArchetypes()) >= job.targetCount) {
    return updateAiJobProgress(job.id, { status: 'done' });
  }
  const batch = Math.min(BATCH_SIZE, job.targetCount - job.processedCount);
  const existing = await getArchetypeNames();
  const generated = await generateArchetypes(existing.slice(0, 200), batch);

  let created = job.createdCount;
  for (const a of generated) {
    const saved = await upsertArchetypeByName({
      name: a.name,
      slotHint: a.slotHint,
      description: a.description,
      example: a.example,
    });
    if (saved) created += 1;
  }
  const processed = job.processedCount + (generated.length || batch);
  const done = processed >= job.targetCount || (await countArchetypes()) >= job.targetCount;
  return updateAiJobProgress(job.id, {
    processedCount: processed,
    createdCount: created,
    status: done ? 'done' : 'running',
  });
}

async function runMealVariantsBatch(job: AiJob): Promise<AiJob> {
  const perArchetype = Math.max(1, Math.min(20, Number(job.params.perArchetype) || 5));
  const archetypes = await listArchetypes(true);
  if (archetypes.length === 0) {
    throw new Error('No enabled archetypes. Generate archetypes first.');
  }

  const counts = await getCardCountsByArchetype();
  let target: MealArchetype | null = null;
  let existingCount = 0;
  for (const a of archetypes) {
    const n = counts[a.id] ?? 0;
    if (n < perArchetype) {
      target = a;
      existingCount = n;
      break;
    }
  }
  if (!target) return updateAiJobProgress(job.id, { status: 'done' });

  const need = Math.min(perArchetype - existingCount, BATCH_SIZE);
  const variants = await generateMealVariants(
    {
      name: target.name,
      slotHint: target.slotHint ?? 'lunch',
      example: target.example,
      description: target.description,
    },
    need,
  );

  let created = job.createdCount;
  let errors = job.errorCount;
  let lastError: string | null = null;

  for (const v of variants) {
    const check = checkMealWeight(
      v.ingredients.map((i) => ({ quantity: i.grams, unit: 'g' })),
      v.totalWeightG,
    );
    if (!check.ok) {
      errors += 1;
      lastError = `${v.name}: ingredient weight ${check.sumG}g exceeds total ${check.totalG}g — skipped`;
      continue;
    }
    await createGeneratedMeal({
      archetypeId: target.id,
      name: v.name,
      description: v.description,
      emoji: v.emoji,
      slotHint: v.slotHint,
      mealSlotAllowed: v.mealSlotAllowed,
      category: v.category,
      mainProtein: v.mainProtein,
      proteinGroup: v.proteinGroup,
      carbBase: v.carbBase,
      mealStyle: v.mealStyle,
      fruitOrVeg: v.fruitOrVeg,
      totalWeightG: v.totalWeightG,
      ingredientsSpec: v.ingredients.map((i) => ({ name: i.name, grams: i.grams })),
    });
    created += 1;
  }

  const processed = job.processedCount + need;
  const after = await getCardCountsByArchetype();
  const allSatisfied = archetypes.every((a) => (after[a.id] ?? 0) >= perArchetype);
  return updateAiJobProgress(job.id, {
    processedCount: processed,
    createdCount: created,
    errorCount: errors,
    status: allSatisfied ? 'done' : 'running',
    lastError,
  });
}

// Pure DB work — enqueue every NEW pending ingredient name (not already an ingredient
// or a pending candidate) in a single pass, so it completes in one batch.
async function runExtractIngredientsBatch(job: AiJob): Promise<AiJob> {
  const pendingNames = await getAllPendingIngredientNames(); // distinct, lowercased
  if (pendingNames.length === 0) return updateAiJobProgress(job.id, { status: 'done' });

  const queued = new Set(await getPendingCandidateNames());
  const existing = new Set(await getExistingIngredientNamesLower(pendingNames));
  const toEnqueue = pendingNames
    .filter((n) => !queued.has(n) && !existing.has(n))
    .map((n) => ({ name: n, allergens: [], dietType: null }));

  if (toEnqueue.length > 0) await addIngredientCandidates(job.id, toEnqueue);

  return updateAiJobProgress(job.id, {
    processedCount: pendingNames.length,
    createdCount: job.createdCount + toEnqueue.length,
    status: 'done',
  });
}

async function runIngredientUsdaBatch(job: AiJob): Promise<AiJob> {
  const candidates = await getAnyPendingCandidates(BATCH_SIZE);
  if (candidates.length === 0) return updateAiJobProgress(job.id, { status: 'done' });

  let processed = job.processedCount;
  let created = job.createdCount;
  let errors = job.errorCount;

  for (const c of candidates) {
    try {
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

function cardSlotBucket(card: { slotHint: string | null; mealSlotAllowed: string[] }): SlotBucket {
  if (isSlotBucket(card.slotHint)) return card.slotHint;
  const slots = card.mealSlotAllowed;
  if (slots.includes('breakfast')) return 'breakfast';
  if (slots.includes('snack_am') || slots.includes('snack_pm')) return 'snack';
  if (slots.includes('dinner')) return 'dinner';
  return 'lunch';
}

async function runFinalizeMealsBatch(job: AiJob): Promise<AiJob> {
  const cards = await getPendingGeneratedMeals(BATCH_SIZE);
  if (cards.length === 0) return updateAiJobProgress(job.id, { status: 'done' });
  const cfg = await getMealValidationConfig();

  let processed = job.processedCount;
  let created = job.createdCount;
  let errors = job.errorCount;
  let lastError: string | null = null;

  for (const card of cards) {
    // Resolve every ingredient spec → a trusted published ingredient.
    const items: MealIngredient[] = [];
    const missing: string[] = [];
    for (const spec of card.ingredientsSpec) {
      const ing = await getIngredientByName(spec.name);
      const trusted =
        ing != null &&
        ing.status === 'published' &&
        ing.calories != null &&
        (!cfg.requireUsdaMatch || ing.usdaFdcId != null);
      if (!ing || !trusted) {
        missing.push(spec.name);
        continue;
      }
      items.push({ ingredientId: ing.id, quantity: spec.grams, unit: 'g', ingredient: ing });
    }

    if (missing.length > 0) {
      const reason = `ingredients not ready: ${missing.slice(0, 6).join(', ')}`;
      await markGeneratedMealRejected(card.id, reason);
      errors += 1;
      processed += 1;
      lastError = `${card.name}: ${reason}`;
      continue;
    }

    const nutrition = computeNutrition(items);
    const validation = validateMealForSlot(nutrition, cardSlotBucket(card), cfg);
    if (!validation.ok) {
      await markGeneratedMealRejected(card.id, validation.reason ?? 'failed validation');
      errors += 1;
      processed += 1;
      lastError = `${card.name}: ${validation.reason}`;
      continue;
    }

    const meal = await createMeal({
      name: card.name,
      description: card.description || card.name,
      mealSlotAllowed: card.mealSlotAllowed.length ? card.mealSlotAllowed : ['lunch'],
      category: card.category || 'general',
      mainProtein: card.mainProtein || 'mixed',
      proteinGroup: card.proteinGroup,
      carbBase: card.carbBase || 'none',
      mealStyle: card.mealStyle.length ? card.mealStyle : ['main_meal'],
      fruitOrVeg: card.fruitOrVeg,
      tags: validation.tags,
      emoji: card.emoji,
      imageUrl: null,
      status: 'draft',
      dietType: null,
      allergens: [],
      allergensOverride: false,
      totalWeightG: card.totalWeightG,
    });
    await setMealIngredients(
      meal.id,
      items.map((it) => ({ ingredientId: it.ingredientId, quantity: it.quantity, unit: it.unit })),
    );
    await markGeneratedMealFinalized(card.id, meal.id);
    created += 1;
    processed += 1;
  }

  const pending = await countGeneratedMealsByStatus('pending');
  const status = pending === 0 ? 'done' : 'running';
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
