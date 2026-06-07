import 'server-only';
import { getDb } from '@/lib/db/client';
import {
  MealValidationConfig,
  DEFAULT_MEAL_VALIDATION_CONFIG,
} from '@/lib/mealValidationConfig';

function deepMerge(
  defaults: MealValidationConfig,
  partial: Partial<MealValidationConfig>,
): MealValidationConfig {
  return {
    enabled: partial.enabled ?? defaults.enabled,
    kcal: { ...defaults.kcal, ...partial.kcal },
    protein: { ...defaults.protein, ...partial.protein },
    requireUsdaMatch: partial.requireUsdaMatch ?? defaults.requireUsdaMatch,
  };
}

export async function getMealValidationConfig(): Promise<MealValidationConfig> {
  const sql = getDb();
  const rows = await sql`SELECT config FROM meal_validation_config WHERE id = 'default'`;
  if (rows.length === 0) return DEFAULT_MEAL_VALIDATION_CONFIG;
  return deepMerge(DEFAULT_MEAL_VALIDATION_CONFIG, rows[0].config as Partial<MealValidationConfig>);
}

export async function updateMealValidationConfig(
  config: MealValidationConfig,
  editorEmail?: string,
): Promise<MealValidationConfig> {
  const sql = getDb();
  const json = JSON.stringify(config);
  await sql`
    INSERT INTO meal_validation_config (id, config, updated_by)
    VALUES ('default', ${json}::jsonb, ${editorEmail ?? null})
    ON CONFLICT (id) DO UPDATE SET
      config = ${json}::jsonb,
      updated_at = now(),
      updated_by = ${editorEmail ?? null}
  `;
  return config;
}
