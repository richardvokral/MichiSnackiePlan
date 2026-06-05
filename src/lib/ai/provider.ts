import 'server-only';
import { AiProvider, AiSettings } from './types';
import { createAnthropicProvider } from './anthropic';
import { getAiConfig } from '@/lib/repository/aiConfig';

// Resolves the configured provider implementation + its settings. Reading the model
// from `ai_config` keeps it admin-configurable; new providers slot in here.
export async function getAiProvider(): Promise<{ provider: AiProvider; settings: AiSettings }> {
  const settings = await getAiConfig();
  if (settings.provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    return { provider: createAnthropicProvider(apiKey), settings };
  }
  throw new Error(`Unknown AI provider: ${settings.provider}`);
}
