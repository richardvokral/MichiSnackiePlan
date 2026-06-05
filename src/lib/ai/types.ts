// Provider-agnostic AI interface. No `server-only` and no SDK import here, so the
// types can be referenced from anywhere; concrete providers live in their own files.
import type { z } from 'zod/v4';

export interface AiSettings {
  provider: string; // 'anthropic' (more can be added without touching callers)
  model: string; // e.g. 'claude-opus-4-8'
}

export interface GenerateJsonArgs<T> {
  system: string;
  prompt: string;
  schema: z.ZodType<T>; // validates the result and is converted to the tool input schema
  schemaName: string; // tool name, e.g. 'emit_ingredients'
  schemaDescription?: string;
  model: string;
  maxTokens?: number;
}

export interface AiProvider {
  // Returns structured JSON validated against the caller's Zod schema.
  generateJson<T>(args: GenerateJsonArgs<T>): Promise<T>;
}
