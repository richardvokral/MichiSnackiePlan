export type MealSlotId = 'breakfast' | 'snack_am' | 'lunch' | 'snack_pm' | 'dinner';

export type MealStatus = 'completed' | 'active' | 'planned' | 'skipped';

export type ProteinGroup = 'dairy' | 'eggs' | 'meat' | 'fish' | 'plant' | 'nuts_seeds' | 'supplement_protein';

export type MealStyle = 'sweet' | 'savory' | 'bowl' | 'sandwich' | 'salad' | 'light' | 'main_meal';

export type FruitOrVeg = 'fruit' | 'veg' | 'both' | 'none';

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
}

export interface SlotState {
  slot: MealSlotId;
  status: MealStatus;
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
