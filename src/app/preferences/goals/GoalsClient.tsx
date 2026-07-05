'use client';

import { useState } from 'react';
import { UserGoals, GOAL_PRESETS, GOAL_LIMITS, hasGoals } from '@/lib/goals';
import { saveGoalsAction, clearGoalsAction } from './actions';

interface GoalsClientProps {
  initialGoals: UserGoals;
}

export default function GoalsClient({ initialGoals }: GoalsClientProps) {
  const [targetKcal, setTargetKcal] = useState<string>(
    initialGoals.targetKcal != null ? String(initialGoals.targetKcal) : '',
  );
  const [targetProteinG, setTargetProteinG] = useState<string>(
    initialGoals.targetProteinG != null ? String(initialGoals.targetProteinG) : '',
  );

  function applyPreset(kcal: number, proteinG: number) {
    setTargetKcal(String(kcal));
    setTargetProteinG(String(proteinG));
  }

  const selectedPreset = GOAL_PRESETS.find(
    (p) => String(p.targetKcal) === targetKcal && String(p.targetProteinG) === targetProteinG,
  );

  return (
    <form action={saveGoalsAction} className="mt-6">
      <p className="text-sm font-semibold text-neutral-700">Pick a preset…</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {GOAL_PRESETS.map((preset) => {
          const active = selectedPreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.targetKcal, preset.targetProteinG)}
              className={`rounded-2xl border p-3 text-left transition-colors ${
                active
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-neutral-200 bg-white hover:border-purple-300'
              }`}
            >
              <p className="text-sm font-semibold text-neutral-800">{preset.label}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-neutral-500">{preset.description}</p>
              <p className="mt-1 text-[11px] font-medium text-purple-600">
                {preset.targetKcal} kcal · {preset.targetProteinG} g
              </p>
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-sm font-semibold text-neutral-700">…or set your own</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-neutral-500">Energy (kcal/day)</span>
          <input
            type="number"
            name="targetKcal"
            value={targetKcal}
            onChange={(e) => setTargetKcal(e.target.value)}
            min={GOAL_LIMITS.kcal.min}
            max={GOAL_LIMITS.kcal.max}
            placeholder="e.g. 1700"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Protein (g/day)</span>
          <input
            type="number"
            name="targetProteinG"
            value={targetProteinG}
            onChange={(e) => setTargetProteinG(e.target.value)}
            min={GOAL_LIMITS.proteinG.min}
            max={GOAL_LIMITS.proteinG.max}
            placeholder="e.g. 100"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
          />
        </label>
      </div>
      <p className="mt-1 text-[11px] text-neutral-400">
        Leave a field empty to skip that target. Allowed: {GOAL_LIMITS.kcal.min}–{GOAL_LIMITS.kcal.max} kcal,{' '}
        {GOAL_LIMITS.proteinG.min}–{GOAL_LIMITS.proteinG.max} g protein.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <button
          type="submit"
          className="w-full rounded-full bg-purple-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-purple-700"
        >
          Save targets
        </button>
        {hasGoals(initialGoals) && (
          <button
            formAction={clearGoalsAction}
            formNoValidate
            className="w-full py-2 text-center text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-600"
          >
            Remove targets — just show totals
          </button>
        )}
      </div>
    </form>
  );
}
