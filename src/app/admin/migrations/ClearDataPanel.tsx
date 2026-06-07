'use client';

import { useState, useTransition } from 'react';
import { clearNutritionDataAction } from './actions';

export default function ClearDataPanel() {
  const [confirm, setConfirm] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string; deleted?: Record<string, number> } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function clear() {
    setResult(null);
    startTransition(async () => {
      setResult(await clearNutritionDataAction(confirm));
      setConfirm('');
    });
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-800">Danger zone</h2>

      <div className="mt-3">
        <a
          href="/api/admin/export-meals"
          download
          className="inline-block rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          ⬇ Export meals (.txt)
        </a>
        <p className="mt-1 text-xs text-neutral-500">Back up the current catalog before clearing.</p>
      </div>

      <div className="mt-5 border-t border-red-200 pt-4">
        <p className="text-sm text-red-800">
          <strong>Clear nutrition data</strong> permanently deletes all ingredients, all meal–ingredient
          pairings, all AI-generated catalog meals, all staged meal cards, and AI jobs/candidates so you
          can re-seed from scratch. Meal archetypes are kept.
        </p>
        <p className="mt-2 text-xs text-red-700">
          ⚠️ This also removes the ingredient links from any private user meals (their meal entries
          remain, but lose their ingredients).
        </p>

        <div className="mt-4 flex items-center gap-2">
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type CLEAR"
            className="w-36 rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={clear}
            disabled={pending || confirm.trim() !== 'CLEAR'}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {pending ? 'Clearing…' : 'Clear nutrition data'}
          </button>
        </div>

        {result && (
          <div className="mt-3 text-sm">
            <p className={result.ok ? 'text-green-700' : 'text-red-700'}>{result.message}</p>
            {result.deleted && (
              <p className="mt-1 text-xs text-neutral-500">
                {Object.entries(result.deleted)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
