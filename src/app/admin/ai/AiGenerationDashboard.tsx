'use client';

import { useRef, useState } from 'react';
import {
  startIngredientNamesJob,
  startIngredientUsdaJob,
  startMealsJob,
  processNextBatch,
} from './actions';
import type { BatchProgress } from '@/lib/ai/batchTypes';

const cardClass = 'rounded-xl bg-white p-5 shadow-sm';
const labelClass = 'block text-sm font-medium text-neutral-700 mb-1';
const inputClass =
  'w-28 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none';
const btnClass =
  'rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:bg-neutral-300';

const TYPE_LABEL: Record<string, string> = {
  ingredient_names: 'Generating ingredient names',
  ingredient_usda: 'Loading nutrition from USDA',
  meals: 'Generating foods',
};

export default function AiGenerationDashboard({ pendingCandidates }: { pendingCandidates: number }) {
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [namesTarget, setNamesTarget] = useState(20);
  const [mealsTarget, setMealsTarget] = useState(10);
  const cancelRef = useRef(false);

  async function drive(initial: BatchProgress) {
    setProgress(initial);
    if (initial.done) return;
    setRunning(true);
    cancelRef.current = false;
    let current = initial;
    try {
      while (!current.done && current.status !== 'error' && !cancelRef.current) {
        current = await processNextBatch(current.jobId);
        setProgress(current);
      }
    } catch (e) {
      setProgress((p) =>
        p ? { ...p, status: 'error', lastError: e instanceof Error ? e.message : String(e) } : p,
      );
    } finally {
      setRunning(false);
    }
  }

  async function startNames() {
    if (running) return;
    await drive(await startIngredientNamesJob(namesTarget));
  }
  async function startUsda() {
    if (running) return;
    await drive(await startIngredientUsdaJob());
  }
  async function startMeals() {
    if (running) return;
    await drive(await startMealsJob(mealsTarget));
  }
  async function resume() {
    if (running || !progress) return;
    await drive({ ...progress, status: 'running', done: false });
  }
  function stop() {
    cancelRef.current = true;
  }

  const pct =
    progress && progress.target > 0
      ? Math.min(100, Math.round((progress.processed / progress.target) * 100))
      : progress?.done
        ? 100
        : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <h3 className="font-semibold text-neutral-800">1. Ingredient names</h3>
          <p className="mt-1 text-xs text-neutral-500">
            AI proposes new ingredient names (10 per batch), seeded with what you already have.
          </p>
          <div className="mt-3 flex items-end gap-2">
            <div>
              <label className={labelClass}>How many</label>
              <input
                type="number"
                min={1}
                max={2000}
                value={namesTarget}
                onChange={(e) => setNamesTarget(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <button onClick={startNames} disabled={running} className={btnClass}>
              Generate
            </button>
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="font-semibold text-neutral-800">2. Load from USDA</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Enrich pending names with USDA nutrition and land them as draft ingredients.
          </p>
          <p className="mt-2 text-xs font-medium text-neutral-600">{pendingCandidates} pending name(s)</p>
          <button onClick={startUsda} disabled={running} className={`${btnClass} mt-3`}>
            Load from USDA
          </button>
        </div>

        <div className={cardClass}>
          <h3 className="font-semibold text-neutral-800">3. Foods</h3>
          <p className="mt-1 text-xs text-neutral-500">
            AI proposes new foods with ingredients &amp; weights (≤100% of total). Lands as drafts.
          </p>
          <div className="mt-3 flex items-end gap-2">
            <div>
              <label className={labelClass}>How many</label>
              <input
                type="number"
                min={1}
                max={500}
                value={mealsTarget}
                onChange={(e) => setMealsTarget(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <button onClick={startMeals} disabled={running} className={btnClass}>
              Generate
            </button>
          </div>
        </div>
      </div>

      {progress && (
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-700">
              {TYPE_LABEL[progress.type] ?? progress.type}
            </span>
            <span className="text-xs text-neutral-500">
              {progress.processed}/{progress.target} · {progress.created} created · {progress.errors} errors
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className={`h-full ${progress.status === 'error' ? 'bg-red-400' : 'bg-purple-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                progress.done
                  ? 'bg-green-100 text-green-700'
                  : progress.status === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {progress.done ? 'done' : progress.status}
            </span>
            {running && (
              <button onClick={stop} className="text-xs text-neutral-500 hover:text-neutral-700">
                Stop
              </button>
            )}
            {!running && progress.status === 'error' && (
              <button onClick={resume} className="text-xs font-medium text-purple-600 hover:text-purple-800">
                Resume
              </button>
            )}
          </div>
          {progress.lastError && (
            <p className="mt-2 text-xs text-red-500">{progress.lastError}</p>
          )}
        </div>
      )}
    </div>
  );
}
