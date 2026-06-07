// Per-slot kcal/protein validation rules for finalizing generated meals. Pure +
// client-safe (no `server-only`), like mealValidation.ts — shared by the finalize
// job and the Meal Rules admin form.

export type SlotBucket = 'breakfast' | 'snack' | 'lunch' | 'dinner';
export const SLOT_BUCKETS: SlotBucket[] = ['breakfast', 'snack', 'lunch', 'dinner'];

export interface MealValidationConfig {
  enabled: boolean;
  kcal: Record<SlotBucket, { min: number; max: number }>;
  protein: { proteinMealMinG: number; highProteinMinG: number };
  requireUsdaMatch: boolean;
}

export const DEFAULT_MEAL_VALIDATION_CONFIG: MealValidationConfig = {
  enabled: true,
  kcal: {
    breakfast: { min: 300, max: 550 },
    snack: { min: 100, max: 300 },
    lunch: { min: 400, max: 750 },
    dinner: { min: 400, max: 750 },
  },
  protein: { proteinMealMinG: 20, highProteinMinG: 30 },
  requireUsdaMatch: true,
};

export interface MealValidationResult {
  ok: boolean;
  reason: string | null;
  tags: string[]; // 'protein' (>=20g) / 'high_protein' (>=30g) — annotations, not gates
}

export function isSlotBucket(value: unknown): value is SlotBucket {
  return typeof value === 'string' && (SLOT_BUCKETS as string[]).includes(value);
}

function deriveProteinTags(
  nutrition: { proteinG: number },
  config: MealValidationConfig,
): string[] {
  const tags: string[] = [];
  if (nutrition.proteinG >= config.protein.proteinMealMinG) tags.push('protein');
  if (nutrition.proteinG >= config.protein.highProteinMinG) tags.push('high_protein');
  return tags;
}

// kcal range is the hard gate; protein thresholds only produce tags.
export function validateMealForSlot(
  nutrition: { calories: number; proteinG: number },
  slot: SlotBucket,
  config: MealValidationConfig,
): MealValidationResult {
  if (!config.enabled) {
    return { ok: true, reason: null, tags: deriveProteinTags(nutrition, config) };
  }
  const range = config.kcal[slot];
  if (nutrition.calories < range.min) {
    return { ok: false, reason: `${slot} kcal ${nutrition.calories} < min ${range.min}`, tags: [] };
  }
  if (nutrition.calories > range.max) {
    return { ok: false, reason: `${slot} kcal ${nutrition.calories} > max ${range.max}`, tags: [] };
  }
  return { ok: true, reason: null, tags: deriveProteinTags(nutrition, config) };
}
