'use client';

import { useRef, useState, useTransition } from 'react';
import {
  startArchetypesJob,
  startMealVariantsJob,
  startExtractIngredientsJob,
  startIngredientUsdaJob,
  startIngredientReviewJob,
  startFinalizeMealsJob,
  publishIngredientsAction,
  processNextBatch,
} from './actions';
import type { BatchProgress } from '@/lib/ai/batchTypes';

const cardClass = 'rounded-xl bg-white p-5 shadow-sm';
const labelClass = 'block text-sm font-medium text-neutral-700 mb-1';
const inputClass =
  'w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none';
const btnClass =
  'rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:bg-neutral-300';

const TYPE_LABEL: Record<string, string> = {
  archetypes: 'Generating archetypes',
  meal_variants: 'Generating meal variants',
  extract_ingredients: 'Extracting ingredients',
  ingredient_usda: 'Loading nutrition from USDA',
  ingredient_review: 'Reviewing draft ingredients',
  finalize_meals: 'Finalizing meals',
};

interface DashboardProps {
  archetypeCount: number;
  pendingCards: number;
  finalizedCards: number;
  rejectedCards: number;
  pendingCandidates: number;
  unreviewedDrafts: number;
  publishableDrafts: number;
}

export default function AiGenerationDashboard(props: DashboardProps) {
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [archetypeTarget, setArchetypeTarget] = useState(30);
  const [perArchetype, setPerArchetype] = useState(5);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [publishing, startPublish] = useTransition();
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

  const guard = (fn: () => Promise<BatchProgress>) => async () => {
    if (running) return;
    await drive(await fn());
  };
  const startArchetypes = guard(() => startArchetypesJob(archetypeTarget));
  const startVariants = guard(() => startMealVariantsJob(perArchetype));
  const startExtract = guard(() => startExtractIngredientsJob());
  const startUsda = guard(() => startIngredientUsdaJob());
  const startReview = guard(() => startIngredientReviewJob());
  const startFinalize = guard(() => startFinalizeMealsJob());

  function publish() {
    if (publishing) return;
    setPublishMsg(null);
    startPublish(async () => {
      const r = await publishIngredientsAction();
      setPublishMsg(`Published ${r.published} ingredient(s).`);
    });
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass}>
          <h3 className="font-semibold text-neutral-800">1. Archetypes</h3>
          <p className="mt-1 text-xs text-neutral-500">
            AI proposes reusable dish templates (Yogurt bowl, Oatmeal…).
          </p>
          <p className="mt-2 text-xs font-medium text-neutral-600">{props.archetypeCount} archetype(s)</p>
          <div className="mt-2 flex items-end gap-2">
            <div>
              <label className={labelClass}>Target</label>
              <input
                type="number"
                min={1}
                max={100}
                value={archetypeTarget}
                onChange={(e) => setArchetypeTarget(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <button onClick={startArchetypes} disabled={running} className={btnClass}>
              Generate
            </button>
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="font-semibold text-neutral-800">2. Meal variants</h3>
          <p className="mt-1 text-xs text-neutral-500">
            AI generates variants per enabled archetype as staged cards.
          </p>
          <p className="mt-2 text-xs font-medium text-neutral-600">{props.pendingCards} pending card(s)</p>
          <div className="mt-2 flex items-end gap-2">
            <div>
              <label className={labelClass}>Per archetype</label>
              <input
                type="number"
                min={1}
                max={20}
                value={perArchetype}
                onChange={(e) => setPerArchetype(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <button onClick={startVariants} disabled={running} className={btnClass}>
              Generate
            </button>
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="font-semibold text-neutral-800">3. Extract ingredients</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Collect unique ingredient names from staged cards and queue the new ones.
          </p>
          <button onClick={startExtract} disabled={running} className={`${btnClass} mt-3`}>
            Extract
          </button>
        </div>

        <div className={cardClass}>
          <h3 className="font-semibold text-neutral-800">4. Load from USDA</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Enrich queued ingredients with USDA nutrition as draft ingredients.
          </p>
          <p className="mt-2 text-xs font-medium text-neutral-600">{props.pendingCandidates} queued</p>
          <button onClick={startUsda} disabled={running} className={`${btnClass} mt-3`}>
            Load from USDA
          </button>
        </div>

        <div className={cardClass}>
          <h3 className="font-semibold text-neutral-800">5. Review drafts</h3>
          <p className="mt-1 text-xs text-neutral-500">AI checks/fills draft ingredient nutrition.</p>
          <p className="mt-2 text-xs font-medium text-neutral-600">{props.unreviewedDrafts} unreviewed</p>
          <button onClick={startReview} disabled={running} className={`${btnClass} mt-3`}>
            Review drafts
          </button>
        </div>

        <div className={cardClass}>
          <h3 className="font-semibold text-neutral-800">6. Publish ingredients</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Publish reviewed drafts that have nutrition, so meals can use them.
          </p>
          <p className="mt-2 text-xs font-medium text-neutral-600">{props.publishableDrafts} ready</p>
          <button onClick={publish} disabled={publishing} className={`${btnClass} mt-3`}>
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
          {publishMsg && <p className="mt-2 text-xs text-green-600">{publishMsg}</p>}
        </div>

        <div className={cardClass}>
          <h3 className="font-semibold text-neutral-800">7. Finalize meals</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Turn fully-paired, valid cards into draft meals (rest rejected with a reason).
          </p>
          <p className="mt-2 text-xs font-medium text-neutral-600">
            {props.pendingCards} pending · {props.finalizedCards} done · {props.rejectedCards} rejected
          </p>
          <button onClick={startFinalize} disabled={running} className={`${btnClass} mt-3`}>
            Finalize
          </button>
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
          {progress.lastError && <p className="mt-2 text-xs text-red-500">{progress.lastError}</p>}
        </div>
      )}
    </div>
  );
}
