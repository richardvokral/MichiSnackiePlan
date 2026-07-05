'use client';

import Link from 'next/link';
import { DayNutrition } from '@/lib/nutrition';
import { UserGoals, hasGoals } from '@/lib/goals';
import { EnergyUnit, formatEnergy } from '@/lib/units';
import ProgressBar from './ProgressBar';

interface DailyNutritionCardProps {
  nutrition: DayNutrition;
  goals: UserGoals | null;
  serverUnit: EnergyUnit;
}

// Day totals for the selected meals. With no goals set it stays a plain, calm
// summary; targets (optional) turn the numbers into gentle progress bars.
export default function DailyNutritionCard({ nutrition, goals, serverUnit }: DailyNutritionCardProps) {
  if (nutrition.mealsCounted === 0) return null;

  const energy = formatEnergy(nutrition.calories, serverUnit);
  const approx = nutrition.approximate ? '~' : '';
  const withGoals = hasGoals(goals);
  const targetEnergy = goals?.targetKcal != null ? formatEnergy(goals.targetKcal, serverUnit) : null;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-purple-600">
          Day so far
        </p>
        <Link
          href="/preferences/goals"
          className="text-[11px] font-medium text-neutral-400 hover:text-purple-600"
        >
          {withGoals ? 'Edit targets' : 'Targets (optional)'}
        </Link>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className="text-lg font-bold text-neutral-800">
            {approx}{energy.value}
            <span className="ml-1 text-xs font-medium text-neutral-400">
              {targetEnergy ? `/ ${targetEnergy.value} ` : ''}{energy.label}
            </span>
          </p>
          {goals?.targetKcal != null && (
            <ProgressBar percent={(nutrition.calories / goals.targetKcal) * 100} className="mt-1.5" />
          )}
        </div>
        <div>
          <p className="text-lg font-bold text-neutral-800">
            {approx}{nutrition.proteinG}
            <span className="ml-1 text-xs font-medium text-neutral-400">
              {goals?.targetProteinG != null ? `/ ${goals.targetProteinG} ` : ''}g protein
            </span>
          </p>
          {goals?.targetProteinG != null && (
            <ProgressBar percent={(nutrition.proteinG / goals.targetProteinG) * 100} className="mt-1.5" />
          )}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-neutral-400">
        {nutrition.mealsCounted} {nutrition.mealsCounted === 1 ? 'meal' : 'meals'} · carbs {approx}
        {nutrition.carbsG} g · fat {approx}{nutrition.fatG} g
        {nutrition.approximate ? ' · approximate' : ''}
      </p>
    </div>
  );
}
