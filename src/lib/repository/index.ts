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
  getPublishedIngredients,
  getIngredientById,
  getIngredientByName,
  getIngredientByUsdaId,
  createIngredient,
  createIngredientDraft,
  updateIngredient,
  setIngredientStatus,
  deleteIngredient,
} from './ingredients';
export type { IngredientInput } from './ingredients';

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
  getAiConfig,
  updateAiConfig,
  DEFAULT_AI_SETTINGS,
} from './aiConfig';

export {
  createAiJob,
  getAiJob,
  listAiJobs,
  updateAiJobProgress,
  addIngredientCandidates,
  countPendingCandidates,
  countAllPendingCandidates,
  getPendingCandidates,
  getAnyPendingCandidates,
  getJobCandidateNames,
  markCandidate,
} from './aiJobs';
export type { AiJob, AiJobType, AiJobStatus, IngredientCandidate } from './aiJobs';

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
