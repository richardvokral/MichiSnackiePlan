import 'server-only';
import { z } from 'zod/v4';
import { getAiProvider } from './provider';
import { DIET_TYPES, ALLERGENS } from '@/lib/diet';

// ---- Meal archetypes ----

const SLOT_HINTS = ['breakfast', 'snack', 'lunch', 'dinner'] as const;

const archetypeSchema = z.object({
  archetypes: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        slotHint: z.enum(SLOT_HINTS),
        description: z.string().max(300).default(''),
        example: z.string().max(200).default(''),
      }),
    )
    .max(10),
});

export interface GeneratedArchetype {
  name: string;
  slotHint: (typeof SLOT_HINTS)[number];
  description: string;
  example: string;
}

export async function generateArchetypes(existing: string[], count: number): Promise<GeneratedArchetype[]> {
  const { provider, settings } = await getAiProvider();
  const system =
    'You are a meal-planning catalog designer. You propose broad, reusable MEAL ARCHETYPES ' +
    '(templates, not specific recipes) that each yield many variants — e.g. "Yogurt bowl", ' +
    '"Oatmeal", "Egg toast", "Chicken rice bowl", "Tuna sandwich", "Lentil soup", "Cottage ' +
    'cheese snack", "Apple + peanut butter", "Salmon + potatoes", "Tofu stir fry". Each archetype ' +
    'belongs to a slot bucket: breakfast, snack, lunch, or dinner.';
  const prompt =
    `Existing archetypes (do NOT repeat any of these):\n` +
    `${existing.length ? existing.join(', ') : '(none yet)'}\n\n` +
    `Propose exactly ${count} NEW meal archetypes, distinct from the list above and from each other. ` +
    `For each give a short name, its slot bucket, a one-line description, and a canonical example ` +
    `(e.g. "Greek yogurt + berries + granola").`;
  const result = await provider.generateJson({
    system,
    prompt,
    schema: archetypeSchema,
    schemaName: 'emit_archetypes',
    schemaDescription: 'Emit a batch of reusable meal archetypes.',
    model: settings.model,
  });
  return result.archetypes.slice(0, count);
}

// ---- Meal variants ----

const MEAL_SLOTS = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'] as const;
const PROTEIN_GROUPS = ['dairy', 'eggs', 'meat', 'fish', 'plant', 'nuts_seeds', 'supplement_protein'] as const;
const MEAL_STYLES = ['sweet', 'savory', 'bowl', 'sandwich', 'salad', 'light', 'main_meal'] as const;
const FRUIT_OR_VEG = ['fruit', 'veg', 'both', 'none'] as const;

// Ingredient names are FREE-FORM here (not an enum) because the ingredients don't exist
// yet — extraction + USDA build them afterward. The prompt insists on canonical,
// single-food, USDA-matchable names.
const mealVariantSchema = z.object({
  variants: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        description: z.string().min(1).max(500),
        emoji: z.string().max(8).default(''),
        slotHint: z.enum(SLOT_HINTS),
        mealSlotAllowed: z.array(z.enum(MEAL_SLOTS)).min(1),
        category: z.string().min(1).max(60),
        mainProtein: z.string().min(1).max(60),
        proteinGroup: z.enum(PROTEIN_GROUPS),
        carbBase: z.string().min(1).max(60),
        mealStyle: z.array(z.enum(MEAL_STYLES)).min(1),
        fruitOrVeg: z.enum(FRUIT_OR_VEG),
        totalWeightG: z.number().positive(),
        ingredients: z
          .array(z.object({ name: z.string().min(1).max(80), grams: z.number().nonnegative() }))
          .min(1)
          .max(12),
      }),
    )
    .max(10),
});

export interface GeneratedMealVariant {
  name: string;
  description: string;
  emoji: string;
  slotHint: (typeof SLOT_HINTS)[number];
  mealSlotAllowed: (typeof MEAL_SLOTS)[number][];
  category: string;
  mainProtein: string;
  proteinGroup: (typeof PROTEIN_GROUPS)[number];
  carbBase: string;
  mealStyle: (typeof MEAL_STYLES)[number][];
  fruitOrVeg: (typeof FRUIT_OR_VEG)[number];
  totalWeightG: number;
  ingredients: { name: string; grams: number }[];
}

export async function generateMealVariants(
  archetype: { name: string; slotHint: string; example: string; description: string },
  count: number,
): Promise<GeneratedMealVariant[]> {
  const { provider, settings } = await getAiProvider();
  const system =
    'You generate concrete MEAL VARIANTS of a given archetype for a meal-planning catalog. ' +
    'Every ingredient name MUST be a canonical, single-food, USDA-FoodData-Central-matchable name ' +
    '(e.g. "Greek yogurt", "rolled oats", "chicken breast", "cherry tomatoes") — never brand names, ' +
    'never composite/multi-food entries. The sum of ingredient grams MUST be <= totalWeightG. Choose ' +
    'mealSlotAllowed consistent with the slot bucket (snack -> snack_am and snack_pm).';
  const prompt =
    `Archetype: "${archetype.name}" (slot: ${archetype.slotHint})` +
    `${archetype.example ? `\nExample: ${archetype.example}` : ''}` +
    `${archetype.description ? `\nDescription: ${archetype.description}` : ''}\n\n` +
    `Generate exactly ${count} DISTINCT variants of this archetype. Keep each variant's slotHint ` +
    `as "${archetype.slotHint}". Give each a total prepared weight in grams and a list of canonical ` +
    `single-food ingredients with gram weights summing to <= the total weight.`;
  const result = await provider.generateJson({
    system,
    prompt,
    schema: mealVariantSchema,
    schemaName: 'emit_variants',
    schemaDescription: 'Emit meal variants with canonical ingredient names and grams.',
    model: settings.model,
  });
  return result.variants.slice(0, count);
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
