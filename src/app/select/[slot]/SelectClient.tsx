'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Meal, MealSlotId, SLOT_LABELS, SLOT_SUBTITLES, SLOT_ORDER } from '@/lib/types';
import { getDailyPlan, selectMeal, skipMeal } from '@/lib/store';
import { getRecommendations } from '@/lib/recommendations';
import { RecommendationConfig } from '@/lib/recommendationConfig';
import StepProgress from '@/components/StepProgress';
import MealOptionCard from '@/components/MealOptionCard';

interface SelectClientProps {
  slot: MealSlotId;
  meals: Meal[];
  config: RecommendationConfig;
}

export default function SelectClient({ slot, meals, config }: SelectClientProps) {
  const router = useRouter();
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);

  const stepIndex = SLOT_ORDER.indexOf(slot) + 1;
  const label = SLOT_LABELS[slot] || slot;
  const subtitle = SLOT_SUBTITLES[slot] || '';

  const recommended = useMemo(() => {
    if (typeof window === 'undefined') return [];
    const plan = getDailyPlan();
    return getRecommendations(slot, plan, meals, config);
  }, [slot, meals, config]);

  function handleConfirm() {
    if (!selectedMeal) return;
    selectMeal(slot, selectedMeal.id);
    router.push('/');
  }

  function handleSkip() {
    skipMeal(slot);
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-8">
      <div className="mx-auto max-w-lg px-5 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-purple-700">Nourish</span>
          <div className="w-8" />
        </div>

        {/* Step progress */}
        <div className="mt-4">
          <StepProgress current={stepIndex} total={5} />
        </div>

        {/* Title */}
        <div className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-800">
            Choose your<br />{label.toLowerCase()}.
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>

        {/* Meal options */}
        <div className="mt-6 space-y-4">
          {recommended.map((meal) => (
            <MealOptionCard
              key={meal.id}
              meal={meal}
              selected={selectedMeal?.id === meal.id}
              onSelect={setSelectedMeal}
            />
          ))}
          {recommended.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-semibold text-neutral-600">No options available</p>
              <p className="mt-1 text-sm text-neutral-400">Try skipping this meal slot.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8">
          <button
            onClick={handleConfirm}
            disabled={!selectedMeal}
            className={`w-full rounded-full py-4 text-center text-base font-semibold transition-colors ${
              selectedMeal
                ? 'bg-purple-600 text-white shadow-md hover:bg-purple-700'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            }`}
          >
            Confirm Selection
          </button>
          <button
            onClick={handleSkip}
            className="mt-3 w-full py-2 text-center text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-600"
          >
            I&apos;m not hungry right now
          </button>
        </div>
      </div>
    </div>
  );
}
