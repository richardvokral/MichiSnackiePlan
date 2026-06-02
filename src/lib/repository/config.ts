import 'server-only';
import { getDb } from '@/lib/db/client';
import {
  RecommendationConfig,
  DEFAULT_RECOMMENDATION_CONFIG,
} from '@/lib/recommendationConfig';

function deepMerge(defaults: RecommendationConfig, partial: Partial<RecommendationConfig>): RecommendationConfig {
  return {
    baseScore: partial.baseScore ?? defaults.baseScore,
    weights: { ...defaults.weights, ...partial.weights },
    thresholds: { ...defaults.thresholds, ...partial.thresholds },
    rules: { ...defaults.rules, ...partial.rules },
  };
}

export async function getRecommendationConfig(): Promise<RecommendationConfig> {
  const sql = getDb();
  const rows = await sql`SELECT config FROM recommendation_config WHERE id = 'default'`;
  if (rows.length === 0) return DEFAULT_RECOMMENDATION_CONFIG;
  return deepMerge(DEFAULT_RECOMMENDATION_CONFIG, rows[0].config as Partial<RecommendationConfig>);
}

export async function updateRecommendationConfig(
  config: RecommendationConfig,
  editorEmail?: string,
): Promise<RecommendationConfig> {
  const sql = getDb();
  const jsonConfig = JSON.stringify(config);
  await sql`
    INSERT INTO recommendation_config (id, config, updated_by)
    VALUES ('default', ${jsonConfig}::jsonb, ${editorEmail ?? null})
    ON CONFLICT (id) DO UPDATE SET
      config = ${jsonConfig}::jsonb,
      updated_at = now(),
      updated_by = ${editorEmail ?? null}
  `;
  return config;
}
