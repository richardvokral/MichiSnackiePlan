export interface RecommendationConfig {
  baseScore: number;
  weights: {
    repeatCarbBasePenalty: number;
    tooMuchDairyPenalty: number;
    tooMuchBreadPenalty: number;
    sameStyleAsPrevPenalty: number;
    alternatingSweetSavoryReward: number;
    newCategoryReward: number;
  };
  thresholds: {
    dairyCountThreshold: number;
    breadCountThreshold: number;
  };
  rules: {
    noExactRepeat: boolean;
    noSameMainProteinAsPrev: boolean;
    noSameProteinGroupAsPrev: boolean;
    noSameCategoryAsPrev: boolean;
    lunchDinnerRequireVeg: boolean;
  };
}

export const DEFAULT_RECOMMENDATION_CONFIG: RecommendationConfig = {
  baseScore: 100,
  weights: {
    repeatCarbBasePenalty: -20,
    tooMuchDairyPenalty: -15,
    tooMuchBreadPenalty: -10,
    sameStyleAsPrevPenalty: -10,
    alternatingSweetSavoryReward: 10,
    newCategoryReward: 5,
  },
  thresholds: {
    dairyCountThreshold: 2,
    breadCountThreshold: 2,
  },
  rules: {
    noExactRepeat: true,
    noSameMainProteinAsPrev: true,
    noSameProteinGroupAsPrev: true,
    noSameCategoryAsPrev: true,
    lunchDinnerRequireVeg: true,
  },
};
