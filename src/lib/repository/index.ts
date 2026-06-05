export {
  getPublishedMeals,
  getAllMeals,
  getMealById,
  getMealWithMeta,
  createMeal,
  updateMeal,
  setMealStatus,
  enrichMealsWithDietInfo,
  getPublishedMealsWithDietInfo,
  getMealDetail,
  getPublishedMealsForUser,
  listUserMeals,
  createUserMeal,
} from './meals';

export {
  listIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from './ingredients';

export {
  getMealIngredients,
  setMealIngredients,
} from './mealIngredients';
export type { MealIngredientInput } from './mealIngredients';

export {
  getUserFavoriteIds,
  addFavorite,
  removeFavorite,
} from './favorites';

export {
  getRecommendationConfig,
  updateRecommendationConfig,
} from './config';

export {
  listAdmins,
  addAdmin,
  removeAdmin,
  isAdminEmail,
} from './admins';

export {
  createFreshSlots,
  getUserPlan,
  saveUserPlan,
  listUserPlanDates,
  getRecentSelectedMealIds,
} from './plans';

export {
  getUserPreferences,
  setUserPreference,
  removeUserPreference,
} from './preferences';
export type { MealPreferences } from './preferences';

export {
  getUserDietPreferences,
  setUserDietPreferences,
  getUserEnergyUnit,
  setUserEnergyUnit,
} from './dietPreferences';

export {
  getMigrationStatus,
  runAndVerifyMigrations,
} from './migrations';
