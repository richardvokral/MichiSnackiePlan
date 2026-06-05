import 'server-only';
import { getDb } from '@/lib/db/client';
import { AiSettings } from '@/lib/ai/types';

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'anthropic',
  model: 'claude-opus-4-8',
};

export async function getAiConfig(): Promise<AiSettings> {
  const sql = getDb();
  const rows = await sql`SELECT config FROM ai_config WHERE id = 'default'`;
  if (rows.length === 0) return DEFAULT_AI_SETTINGS;
  return { ...DEFAULT_AI_SETTINGS, ...(rows[0].config as Partial<AiSettings>) };
}

export async function updateAiConfig(settings: AiSettings, editorEmail?: string): Promise<AiSettings> {
  const sql = getDb();
  const json = JSON.stringify(settings);
  await sql`
    INSERT INTO ai_config (id, config, updated_by)
    VALUES ('default', ${json}::jsonb, ${editorEmail ?? null})
    ON CONFLICT (id) DO UPDATE SET
      config = ${json}::jsonb,
      updated_at = now(),
      updated_by = ${editorEmail ?? null}
  `;
  return settings;
}
