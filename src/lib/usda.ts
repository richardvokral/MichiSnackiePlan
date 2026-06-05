import 'server-only';

// Thin server-only wrapper around the USDA FoodData Central (FDC) API.
// Docs: https://fdc.nal.usda.gov/api-guide.html  (free key: /api-key-signup)
//
// FDC returns each food's `foodNutrients` normalized to a per-100g basis for
// Foundation, SR Legacy, Survey (FNDDS), AND Branded foods, so we read macros
// directly without per-serving math. We still prefer generic data types over
// Branded for cleaner, brand-neutral staples.

const FDC_BASE = 'https://api.nal.usda.gov/fdc/v1';
const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

// Nutrient numbers (legacy) → macro. kcal energy is 208 (1008 is the newer id);
// 957/268 is energy in kJ which we ignore in favor of kcal.
const NUTRIENT = {
  calories: ['208', '1008'],
  proteinG: ['203', '1003'],
  carbsG: ['205', '1005'],
  fatG: ['204', '1004'],
} as const;

export interface UsdaSearchHit {
  fdcId: number;
  description: string;
  dataType: string; // 'Foundation' | 'SR Legacy' | 'Survey (FNDDS)' | 'Branded'
  brandOwner?: string;
  foodNutrients?: RawNutrient[];
}

export interface UsdaNutritionPer100g {
  calories: number | null; // kcal per 100g
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

// Both the search and detail endpoints expose nutrient rows, with slightly
// different field names. We tolerate either shape.
interface RawNutrient {
  nutrientNumber?: string; // search shape
  value?: number; // search shape
  amount?: number; // detail shape
  nutrient?: { number?: string };
}

export class UsdaError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = 'UsdaError';
  }
}

function getKey(): string {
  const key = process.env.USDA_API_KEY;
  if (!key) throw new UsdaError('USDA_API_KEY is not set', false);
  return key;
}

async function fdcFetch(path: string): Promise<unknown> {
  const url = `${FDC_BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(getKey())}`;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) return res.json();
      const retryable = res.status === 429 || res.status >= 500;
      const body = await res.text().catch(() => '');
      lastErr = new UsdaError(`USDA ${res.status}: ${body.slice(0, 200)}`, retryable);
      if (!retryable) throw lastErr;
    } catch (e) {
      lastErr = e instanceof UsdaError ? e : new UsdaError(`USDA request failed: ${String(e)}`, true);
      if (e instanceof UsdaError && !e.retryable) throw e;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
  }
  throw lastErr instanceof Error ? lastErr : new UsdaError('USDA request failed', true);
}

function nutrientNumber(n: RawNutrient): string | undefined {
  return n.nutrientNumber ?? n.nutrient?.number;
}

function nutrientValue(n: RawNutrient): number | undefined {
  return n.value ?? n.amount;
}

function extractPer100g(nutrients: RawNutrient[] | undefined): UsdaNutritionPer100g {
  const result: UsdaNutritionPer100g = { calories: null, proteinG: null, carbsG: null, fatG: null };
  if (!nutrients) return result;
  for (const [macro, numbers] of Object.entries(NUTRIENT) as [keyof UsdaNutritionPer100g, readonly string[]][]) {
    for (const n of nutrients) {
      const num = nutrientNumber(n);
      const val = nutrientValue(n);
      if (num && val != null && (numbers as readonly string[]).includes(num)) {
        result[macro] = Math.round(val * 10) / 10;
        break;
      }
    }
  }
  return result;
}

// Rank generic data types ahead of Branded for brand-neutral staples.
const DATA_TYPE_RANK: Record<string, number> = {
  Foundation: 0,
  'SR Legacy': 1,
  'Survey (FNDDS)': 2,
  Branded: 3,
};

export async function searchUsdaFoods(query: string, opts?: { pageSize?: number }): Promise<UsdaSearchHit[]> {
  const pageSize = opts?.pageSize ?? 10;
  const data = (await fdcFetch(
    `/foods/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}`,
  )) as { foods?: UsdaSearchHit[] };
  const foods = data.foods ?? [];
  return [...foods].sort(
    (a, b) => (DATA_TYPE_RANK[a.dataType] ?? 9) - (DATA_TYPE_RANK[b.dataType] ?? 9),
  );
}

export async function getUsdaFood(
  fdcId: number,
): Promise<{ description: string; dataType: string; nutrition: UsdaNutritionPer100g } | null> {
  const data = (await fdcFetch(`/food/${fdcId}`)) as {
    description?: string;
    dataType?: string;
    foodNutrients?: RawNutrient[];
  } | null;
  if (!data || !data.description) return null;
  return {
    description: data.description,
    dataType: data.dataType ?? 'unknown',
    nutrition: extractPer100g(data.foodNutrients),
  };
}

// Search → best hit → per-100g macros, ready to land as a draft ingredient.
// Returns null when no usable match is found.
export async function resolveUsdaIngredient(
  name: string,
): Promise<{ name: string; usdaFdcId: string; nutrition: UsdaNutritionPer100g } | null> {
  const hits = await searchUsdaFoods(name, { pageSize: 5 });
  if (hits.length === 0) return null;
  const best = hits[0];

  // The search hit usually carries foodNutrients already; fall back to the detail
  // endpoint if they're missing or empty.
  let nutrition = extractPer100g(best.foodNutrients);
  const hasAny = nutrition.calories != null || nutrition.proteinG != null || nutrition.carbsG != null || nutrition.fatG != null;
  if (!hasAny) {
    const detail = await getUsdaFood(best.fdcId);
    if (detail) nutrition = detail.nutrition;
  }

  return { name: best.description || name, usdaFdcId: String(best.fdcId), nutrition };
}
