// Optional daily targets (kcal + protein). Pure + client-safe. Goals are
// deliberately opt-in: the app works fully without them and never nags — a
// target just turns the day totals into gentle progress bars.

export interface UserGoals {
  targetKcal: number | null;
  targetProteinG: number | null;
}

export const NO_GOALS: UserGoals = { targetKcal: null, targetProteinG: null };

export function hasGoals(goals: UserGoals | null | undefined): boolean {
  return Boolean(goals && (goals.targetKcal != null || goals.targetProteinG != null));
}

// Presets anchored to the per-slot kcal ranges in DEFAULT_MEAL_VALIDATION_CONFIG
// (5 slots sum to roughly 1300–2650 kcal/day), so a preset is always reachable
// with the catalog's own meals.
export interface GoalPreset {
  id: string;
  label: string;
  description: string;
  targetKcal: number;
  targetProteinG: number;
}

export const GOAL_PRESETS: GoalPreset[] = [
  {
    id: 'light',
    label: 'Light & lean',
    description: 'A gentle deficit for leaning out.',
    targetKcal: 1500,
    targetProteinG: 90,
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Comfortable everyday maintenance.',
    targetKcal: 1800,
    targetProteinG: 100,
  },
  {
    id: 'active',
    label: 'Active',
    description: 'More fuel for training days.',
    targetKcal: 2200,
    targetProteinG: 120,
  },
];

// Sanity bounds for custom values (form validation, not medical advice).
export const GOAL_LIMITS = {
  kcal: { min: 1000, max: 4000 },
  proteinG: { min: 30, max: 250 },
};
