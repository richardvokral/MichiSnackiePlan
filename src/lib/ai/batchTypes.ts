// Shared (non-server) types for the incremental batch dashboard. Kept out of the
// 'use server' actions file (which may only export async functions) and out of the
// server-only repo, so the client dashboard can import them.
export type AiJobType =
  | 'ingredient_usda'
  | 'ingredient_review'
  | 'archetypes'
  | 'meal_variants'
  | 'extract_ingredients'
  | 'finalize_meals';
export type AiJobStatus = 'pending' | 'running' | 'done' | 'error';

export interface BatchProgress {
  jobId: string;
  type: AiJobType;
  status: AiJobStatus;
  processed: number;
  target: number;
  created: number;
  errors: number;
  done: boolean;
  lastError: string | null;
}
