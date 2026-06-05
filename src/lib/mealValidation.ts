// Pure meal-weight validation, shared by the AI import path and the admin meal form.
// MUST stay free of `server-only` and any DB/Node access so it can live in the client
// bundle (like nutrition.ts / diet.ts).

// Units we can sum by weight. Non-gram/ml units (e.g. "piece") can't be reconciled
// against a gram total without a per-piece weight we don't model, so they make the
// check indeterminate rather than failing it outright.
const SUMMABLE_UNITS = new Set(['g', 'ml']);

export interface WeightCheckResult {
  ok: boolean; // ingredient weights are within the total (<= 100%)
  sumG: number; // summed grams of summable ingredients
  totalG: number; // declared total weight
  ratio: number; // sumG / totalG (0 when total is unknown)
  indeterminate: boolean; // some ingredient used a non-summable unit
}

export function checkMealWeight(
  ingredients: { quantity: number; unit: string }[],
  totalWeightG: number | null | undefined,
): WeightCheckResult {
  let sumG = 0;
  let indeterminate = false;
  for (const item of ingredients) {
    if (SUMMABLE_UNITS.has(item.unit) && item.quantity > 0) {
      sumG += item.quantity;
    } else if (!SUMMABLE_UNITS.has(item.unit)) {
      indeterminate = true;
    }
  }
  const totalG = totalWeightG ?? 0;
  const ratio = totalG > 0 ? sumG / totalG : 0;
  // Tiny epsilon so exactly-100% passes despite floating point.
  const ok = totalG > 0 && sumG <= totalG + 1e-6;
  return { ok, sumG: Math.round(sumG * 10) / 10, totalG, ratio, indeterminate };
}
