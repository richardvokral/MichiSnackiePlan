// Pure dietary helpers shared by the client (recommendation engine, forms) and
// the server (repository, server actions). MUST stay free of `server-only` and
// any DB/Node access so it can live in the client bundle.

export const DIET_TYPES = ['omnivore', 'vegetarian', 'pescetarian', 'vegan'] as const;
export type DietType = (typeof DIET_TYPES)[number];

export const DIET_LABELS: Record<DietType, string> = {
  omnivore: 'Omnivore — everything',
  vegetarian: 'Vegetarian — no meat or fish',
  pescetarian: 'Pescetarian — fish, no meat',
  vegan: 'Vegan — no animal products',
};

export const ALLERGENS = [
  'milk',
  'eggs',
  'peanuts',
  'tree_nuts',
  'gluten',
  'soy',
  'fish',
  'shellfish',
  'sesame',
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  milk: 'Milk / Dairy',
  eggs: 'Eggs',
  peanuts: 'Peanuts',
  tree_nuts: 'Tree nuts',
  gluten: 'Gluten / Wheat',
  soy: 'Soy',
  fish: 'Fish',
  shellfish: 'Shellfish',
  sesame: 'Sesame',
};

// A meal's `dietType` records the strictest diet it satisfies. The containment is
// vegan ⊂ vegetarian ⊂ pescetarian ⊂ omnivore, so a vegan meal is acceptable to
// every eater while an omnivore meal is acceptable only to omnivores. This maps an
// eater's chosen diet to the meal classifications they will accept.
export const DIET_COMPATIBLE: Record<DietType, DietType[]> = {
  vegan: ['vegan'],
  vegetarian: ['vegan', 'vegetarian'],
  pescetarian: ['vegan', 'vegetarian', 'pescetarian'],
  omnivore: ['vegan', 'vegetarian', 'pescetarian', 'omnivore'],
};

export interface DietPreferences {
  dietType: DietType | null;
  allergies: string[];
}

export function isDietType(value: unknown): value is DietType {
  return typeof value === 'string' && (DIET_TYPES as readonly string[]).includes(value);
}

export function isAllergen(value: unknown): value is Allergen {
  return typeof value === 'string' && (ALLERGENS as readonly string[]).includes(value);
}

// Fallback classification from the existing `proteinGroup` enum so diet filtering
// works on the current catalog before any meal has been explicitly classified.
export function dietTypeFromProteinGroup(proteinGroup: string): DietType {
  switch (proteinGroup) {
    case 'meat':
      return 'omnivore';
    case 'fish':
      return 'pescetarian';
    case 'dairy':
    case 'eggs':
    case 'supplement_protein':
      return 'vegetarian';
    case 'plant':
    case 'nuts_seeds':
      return 'vegan';
    default:
      // Unknown protein source: stay permissive (only stricter diets will hide it).
      return 'omnivore';
  }
}

interface MealDietShape {
  dietType?: DietType | null;
  proteinGroup?: string;
  allergens?: string[];
}

// Effective diet classification: an explicit per-meal override wins; otherwise we
// derive from `proteinGroup`.
export function effectiveDietType(meal: MealDietShape): DietType | null {
  if (meal.dietType) return meal.dietType;
  if (meal.proteinGroup) return dietTypeFromProteinGroup(meal.proteinGroup);
  return null;
}

// Containment order — vegan is the least permissive classification, omnivore the most.
const DIET_STRICTNESS: Record<DietType, number> = {
  vegan: 0,
  vegetarian: 1,
  pescetarian: 2,
  omnivore: 3,
};

// The strictest (least permissive) classification across a set — used to derive a
// meal's diet from its ingredients: a dish is only as "vegan" as its least-vegan part.
export function strictestDiet(types: (DietType | null | undefined)[]): DietType | null {
  let result: DietType | null = null;
  for (const t of types) {
    if (!t) continue;
    if (result === null || DIET_STRICTNESS[t] > DIET_STRICTNESS[result]) result = t;
  }
  return result;
}

// True when a meal must be hidden for the given preferences (hard filter). Allergy
// conflicts hide on any known allergen overlap; diet conflicts hide when the meal's
// effective classification is not accepted by the eater's diet.
export function mealConflictsWithPrefs(
  meal: MealDietShape,
  prefs: DietPreferences | null | undefined,
): boolean {
  if (!prefs) return false;

  if (prefs.allergies.length > 0 && meal.allergens && meal.allergens.length > 0) {
    if (meal.allergens.some((a) => prefs.allergies.includes(a))) return true;
  }

  if (prefs.dietType && prefs.dietType !== 'omnivore') {
    const eff = effectiveDietType(meal);
    if (eff && !DIET_COMPATIBLE[prefs.dietType].includes(eff)) return true;
  }

  return false;
}
