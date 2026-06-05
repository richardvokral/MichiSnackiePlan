import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod/v4';
import { AiProvider, GenerateJsonArgs } from './types';

// Anthropic implementation. SDK 0.69 has no `output_config`/structured-output
// helper, so we force a single tool call whose input schema is derived from the
// caller's Zod schema, then validate the tool input with that same schema.
export function createAnthropicProvider(apiKey: string): AiProvider {
  const client = new Anthropic({ apiKey });
  return {
    async generateJson<T>(args: GenerateJsonArgs<T>): Promise<T> {
      const inputSchema = z.toJSONSchema(args.schema) as unknown as Anthropic.Tool.InputSchema;
      const message = await client.messages.create({
        model: args.model,
        max_tokens: args.maxTokens ?? 16000,
        system: args.system,
        tools: [
          {
            name: args.schemaName,
            description: args.schemaDescription ?? 'Return the requested structured data.',
            input_schema: inputSchema,
          },
        ],
        tool_choice: { type: 'tool', name: args.schemaName },
        messages: [{ role: 'user', content: args.prompt }],
      });
      const block = message.content.find((b) => b.type === 'tool_use');
      if (!block || block.type !== 'tool_use') {
        throw new Error('AI did not return structured output');
      }
      return args.schema.parse(block.input);
    },
  };
}
