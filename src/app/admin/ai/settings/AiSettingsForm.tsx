'use client';

import { useState, useTransition } from 'react';
import { updateAiSettingsAction, testAiConnectionAction } from '../actions';
import type { AiSettings } from '@/lib/ai/types';

const inputClass =
  'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none';
const labelClass = 'block text-sm font-medium text-neutral-700 mb-1';

export default function AiSettingsForm({ settings }: { settings: AiSettings }) {
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form action={updateAiSettingsAction} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Provider</label>
            <select name="provider" defaultValue={settings.provider} className={inputClass}>
              <option value="anthropic">anthropic</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Model</label>
            <input name="model" defaultValue={settings.model} className={inputClass} />
            <p className="mt-1 text-xs text-neutral-400">Default: claude-opus-4-8</p>
          </div>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white hover:bg-purple-700"
        >
          Save settings
        </button>
      </form>

      <div className="border-t border-neutral-200 pt-4">
        <button
          onClick={() => startTransition(async () => setTest(await testAiConnectionAction()))}
          disabled={pending}
          className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:bg-neutral-300"
        >
          {pending ? 'Testing…' : 'Test connection'}
        </button>
        {test && (
          <p className={`mt-2 text-sm ${test.ok ? 'text-green-600' : 'text-red-600'}`}>{test.message}</p>
        )}
      </div>
    </div>
  );
}
