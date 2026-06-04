import type { DietType } from './diet';

export type MealSlotId = 'breakfast' | 'snack_am' | 'lunch' | 'snack_pm' | 'dinner';

export type SlotStatus = 'completed' | 'active' | 'planned' | 'skipped';

export type ProteinGroup = 'dairy' | 'eggs' | 'meat' | 'fish' | 'plant' | 'nuts_seeds' | 'supplement_protein';

export type MealStyle = 'sweet' | 'savory' | 'bowl' | 'sandwich' | 'salad' | 'light' | 'main_meal';

export type FruitOrVeg = 'fruit' | 'veg' | 'both' | 'none';

export type MealCatalogStatus = 'draft' | 'published' | 'inactive';

export interface Meal {
  id: string;
  name: string;
  description: string;
  mealSlotAllowed: MealSlotId[];
  category: string;
  mainProtein: string;
  proteinGroup: ProteinGroup;
  carbBase: string;
  mealStyle: MealStyle[];
  fruitOrVeg: FruitOrVeg;
  tags: string[];
  emoji: string;
  imageUrl: string | null;
  status: MealCatalogStatus;
  // Dietary metadata (Phase: dietary preferences). Optional so legacy literal
  // constructions still typecheck; DB-sourced meals always populate them.
  dietType?: DietType | null; // explicit classification override; derived from proteinGroup when null
  allergens?: string[]; // manual allergen tags (effective allergens may be derived from ingredients later)
  allergensOverride?: boolean; // when true, `allergens` is authoritative over any derived set
}

export interface SlotState {
  slot: MealSlotId;
  status: SlotStatus;
  selectedMealId: string | null;
  selectedAt: string | null;
}

export interface DailyPlan {
  date: string;
  slots: SlotState[];
}

export const SLOT_ORDER: MealSlotId[] = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'];

export const SLOT_LABELS: Record<MealSlotId, string> = {
  breakfast: 'Breakfast',
  snack_am: 'Snack',
  lunch: 'Lunch',
  snack_pm: 'Afternoon Snack',
  dinner: 'Dinner',
};

export const SLOT_ICONS: Record<MealSlotId, string> = {
  breakfast: '🌅',
  snack_am: '🍎',
  lunch: '🍽️',
  snack_pm: '🍪',
  dinner: '🌙',
};

export const SLOT_SUBTITLES: Record<MealSlotId, string> = {
  breakfast: 'Fuel your morning with intention.',
  snack_am: 'A light moment to keep you going.',
  lunch: 'Nourish your afternoon energy.',
  snack_pm: 'A gentle pick-me-up for later.',
  dinner: 'End your day with something satisfying.',
};

export const SLOT_TIMES: Record<MealSlotId, string> = {
  breakfast: '8:00 AM',
  snack_am: '10:30 AM',
  lunch: '1:00 PM',
  snack_pm: '4:30 PM',
  dinner: '7:30 PM',
};
