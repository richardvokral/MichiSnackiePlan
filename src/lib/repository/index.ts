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
  countUnreviewedDraftIngredients,
  getUnreviewedDraftIngredients,
  applyIngredientReview,
  publishReviewedIngredientsWithNutrition,
  countPublishableDraftIngredients,
  getExistingIngredientNamesLower,
} from './ingredients';
export type { IngredientInput, IngredientReviewPatch } from './ingredients';

export {
  listArchetypes,
  getArchetype,
  countArchetypes,
  getArchetypeNames,
  createArchetype,
  upsertArchetypeByName,
  updateArchetype,
  deleteArchetype,
} from './archetypes';
export type { MealArchetype, ArchetypeInput } from './archetypes';

export {
  createGeneratedMeal,
  listGeneratedMealsByStatus,
  getPendingGeneratedMeals,
  countGeneratedMealsByStatus,
  countCardsForArchetype,
  getCardCountsByArchetype,
  getAllPendingIngredientNames,
  markGeneratedMealFinalized,
  markGeneratedMealRejected,
  resetGeneratedData,
} from './generatedMeals';
export type { GeneratedMeal, GeneratedMealInput, IngredientSpec, GeneratedMealStatus } from './generatedMeals';

export {
  getMealValidationConfig,
  updateMealValidationConfig,
} from './mealValidationConfig';

export {
  getMealIngredients,
  getMealIngredientsForMeals,
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
  getPendingCandidateNames,
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
  getUserGoals,
  setUserGoals,
} from './dietPreferences';

export {
  getMigrationStatus,
  runAndVerifyMigrations,
} from './migrations';
