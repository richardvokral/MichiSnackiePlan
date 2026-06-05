import 'server-only';
import { z } from 'zod/v4';
import { getAiProvider } from './provider';
import { DIET_TYPES, ALLERGENS } from '@/lib/diet';

// ---- Ingredient names ----

const ingredientNamesSchema = z.object({
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        allergens: z.array(z.enum(ALLERGENS)).default([]),
        dietType: z.enum(DIET_TYPES).nullable().default(null),
      }),
    )
    .max(10),
});

export interface GeneratedIngredientName {
  name: string;
  allergens: string[];
  dietType: string | null;
}

export async function generateIngredientNames(
  existing: string[],
  count: number,
): Promise<GeneratedIngredientName[]> {
  const { provider, settings } = await getAiProvider();
  const system =
    'You are a nutrition database curator. You propose common, real, single-food ' +
    'ingredients (raw or simply-prepared whole foods and staples) that can be looked up ' +
    'in the USDA FoodData Central database. Avoid branded products and composite dishes.';
  const prompt =
    `We already have these ingredients (do NOT repeat any of them):\n` +
    `${existing.length ? existing.join(', ') : '(none yet)'}\n\n` +
    `Propose exactly ${count} NEW ingredients that are different from the list above and ` +
    `from each other. For each, give a concise canonical name (e.g. "Greek yogurt", ` +
    `"rolled oats", "chicken breast"), the common allergens it contains (from the allowed ` +
    `set), and the strictest diet it fits (vegan, vegetarian, pescetarian, or omnivore; ` +
    `null if unsure).`;
  const result = await provider.generateJson({
    system,
    prompt,
    schema: ingredientNamesSchema,
    schemaName: 'emit_ingredients',
    schemaDescription: 'Emit a batch of proposed ingredients.',
    model: settings.model,
  });
  return result.ingredients.slice(0, count).map((i) => ({
    name: i.name,
    allergens: i.allergens,
    dietType: i.dietType,
  }));
}

// ---- Foods (meals) ----

const MEAL_SLOTS = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'] as const;
const PROTEIN_GROUPS = ['dairy', 'eggs', 'meat', 'fish', 'plant', 'nuts_seeds', 'supplement_protein'] as const;
const MEAL_STYLES = ['sweet', 'savory', 'bowl', 'sandwich', 'salad', 'light', 'main_meal'] as const;
const FRUIT_OR_VEG = ['fruit', 'veg', 'both', 'none'] as const;

export interface GeneratedMeal {
  name: string;
  description: string;
  emoji: string;
  mealSlotAllowed: (typeof MEAL_SLOTS)[number][];
  category: string;
  mainProtein: string;
  proteinGroup: (typeof PROTEIN_GROUPS)[number];
  carbBase: string;
  mealStyle: (typeof MEAL_STYLES)[number][];
  fruitOrVeg: (typeof FRUIT_OR_VEG)[number];
  totalWeightG: number;
  ingredients: { name: string; quantityG: number }[];
}

// The ingredient name is constrained to the published catalog via a dynamic enum, so
// the model can ONLY pick names we actually have — no invented/strange ingredients.
function buildMealSchema(allowedIngredientNames: [string, ...string[]]) {
  return z.object({
    meals: z
      .array(
        z.object({
          name: z.string().min(1).max(120),
          description: z.string().min(1).max(500),
          emoji: z.string().max(8).default(''),
          mealSlotAllowed: z.array(z.enum(MEAL_SLOTS)).min(1),
          category: z.string().min(1).max(60),
          mainProtein: z.string().min(1).max(60),
          proteinGroup: z.enum(PROTEIN_GROUPS),
          carbBase: z.string().min(1).max(60),
          mealStyle: z.array(z.enum(MEAL_STYLES)).min(1),
          fruitOrVeg: z.enum(FRUIT_OR_VEG),
          totalWeightG: z.number().positive(),
          ingredients: z
            .array(z.object({ name: z.enum(allowedIngredientNames), quantityG: z.number().nonnegative() }))
            .min(1),
        }),
      )
      .max(10),
  });
}

export async function generateMeals(
  existing: { names: string[]; ingredientNames: string[] },
  count: number,
): Promise<GeneratedMeal[]> {
  const allowed = existing.ingredientNames;
  if (allowed.length === 0) {
    throw new Error(
      'No published ingredients available. Generate and publish ingredients before generating foods.',
    );
  }
  const { provider, settings } = await getAiProvider();
  const schema = buildMealSchema(allowed as [string, ...string[]]);
  const system =
    'You design simple, healthy snack/meal catalog entries for a meal-planning app. ' +
    'Each food has a total prepared weight and a list of ingredients with gram weights. ' +
    'You MUST choose every ingredient name EXACTLY from the provided allowed list — never ' +
    'invent or rename ingredients. The sum of ingredient grams MUST be <= the total weight ' +
    '(it never exceeds 100% of the total).';
  const prompt =
    `Allowed ingredient names (use ONLY these exact names, nothing else):\n` +
    `${allowed.join(', ')}\n\n` +
    `Existing food names (do NOT repeat): ${existing.names.length ? existing.names.join(', ') : '(none)'}\n\n` +
    `Propose exactly ${count} NEW foods for a healthy snack/meal catalog, different from the ` +
    `existing names. Each food has a total prepared weight in grams and ingredients (chosen only ` +
    `from the allowed list) whose gram weights sum to <= the total weight.`;
  const result = await provider.generateJson({
    system,
    prompt,
    schema,
    schemaName: 'emit_meals',
    schemaDescription: 'Emit a batch of proposed foods with ingredients and weights.',
    model: settings.model,
  });
  return result.meals.slice(0, count) as GeneratedMeal[];
}

// ---- Draft-ingredient review ----

const ingredientReviewSchema = z.object({
  ingredients: z.array(
    z.object({
      id: z.string(),
      calories: z.number().nullable(),
      proteinG: z.number().nullable(),
      carbsG: z.number().nullable(),
      fatG: z.number().nullable(),
      allergens: z.array(z.enum(ALLERGENS)),
      dietType: z.enum(DIET_TYPES).nullable(),
      ok: z.boolean(),
      note: z.string().max(300),
    }),
  ),
});

export interface IngredientReviewInput {
  id: string;
  name: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  allergens: string[];
  dietType: string | null;
}

export interface IngredientReviewSuggestion {
  id: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  allergens: string[];
  dietType: string | null;
  ok: boolean;
  note: string;
}

export async function reviewIngredients(items: IngredientReviewInput[]): Promise<IngredientReviewSuggestion[]> {
  const { provider, settings } = await getAiProvider();
  const system =
    'You are a nutrition-database QA reviewer. For each draft ingredient, check whether its ' +
    'per-100g nutrition, allergens, and diet classification are present and plausible. Fill in ' +
    'any MISSING values with your best per-100g estimate, correct clearly-wrong values, and write ' +
    'a short note describing what you changed or confirmed. Set ok=true only when the entry was ' +
    'already complete and plausible.';
  const lines = items
    .map(
      (i) =>
        `- id=${i.id} | name="${i.name}" | kcal=${i.calories ?? 'MISSING'} | protein=${i.proteinG ?? 'MISSING'} | ` +
        `carbs=${i.carbsG ?? 'MISSING'} | fat=${i.fatG ?? 'MISSING'} | allergens=[${i.allergens.join(',') || 'none'}] | ` +
        `diet=${i.dietType ?? 'unset'}`,
    )
    .join('\n');
  const prompt =
    `Review these draft ingredients. Return one entry per ingredient, echoing its id, with the best ` +
    `per-100g calories/protein/carbs/fat (numbers, or null only if truly unknowable), the allergens ` +
    `it contains (from the allowed set), the strictest diet it fits (or null), ok (boolean), and a ` +
    `short note.\n\n${lines}`;
  const result = await provider.generateJson({
    system,
    prompt,
    schema: ingredientReviewSchema,
    schemaName: 'emit_reviews',
    schemaDescription: 'Emit reviewed values + notes for each draft ingredient.',
    model: settings.model,
  });
  return result.ingredients;
}
