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

const generatedMealSchema = z.object({
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
          .array(z.object({ name: z.string().min(1).max(100), quantityG: z.number().nonnegative() }))
          .min(1),
      }),
    )
    .max(10),
});

export type GeneratedMeal = z.infer<typeof generatedMealSchema>['meals'][number];

export async function generateMeals(
  existing: { names: string[]; ingredientNames: string[] },
  count: number,
): Promise<GeneratedMeal[]> {
  const { provider, settings } = await getAiProvider();
  const system =
    'You design simple, healthy snack/meal catalog entries for a meal-planning app. ' +
    'Each food has a total prepared weight and a list of ingredients with gram weights. ' +
    'The sum of ingredient grams MUST be less than or equal to the total weight (it never ' +
    'exceeds 100% of the total). Prefer ingredients from the provided known list.';
  const prompt =
    `Existing food names (do NOT repeat): ${existing.names.length ? existing.names.join(', ') : '(none)'}\n\n` +
    `Known ingredient names you should reuse where possible:\n` +
    `${existing.ingredientNames.length ? existing.ingredientNames.join(', ') : '(none)'}\n\n` +
    `Propose exactly ${count} NEW foods that are similar in spirit to a healthy snack/meal ` +
    `catalog but different from the existing names. For each food include its total prepared ` +
    `weight in grams and its ingredients with gram weights whose sum does NOT exceed the total ` +
    `weight.`;
  const result = await provider.generateJson({
    system,
    prompt,
    schema: generatedMealSchema,
    schemaName: 'emit_meals',
    schemaDescription: 'Emit a batch of proposed foods with ingredients and weights.',
    model: settings.model,
  });
  return result.meals.slice(0, count);
}
