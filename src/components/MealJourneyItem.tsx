'use client';

import Link from 'next/link';
import { Meal, SlotState, SLOT_LABELS, SLOT_ICONS, SLOT_TIMES } from '@/lib/types';

interface MealJourneyItemProps {
  slotState: SlotState;
  mealMap: Record<string, Meal>;
}

export default function MealJourneyItem({ slotState, mealMap }: MealJourneyItemProps) {
  const { slot, status, selectedMealId } = slotState;
  const label = SLOT_LABELS[slot];
  const icon = SLOT_ICONS[slot];
  const meal = selectedMealId ? mealMap[selectedMealId] : null;

  if (status === 'active') {
    return (
      <Link href={`/select/${slot}`} className="block">
        <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-purple-300 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-xl">
            {icon}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-neutral-800">{label}</p>
            <p className="text-sm font-medium text-purple-500">Track now</p>
          </div>
          <button className="rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700">
            Add
          </button>
        </div>
      </Link>
    );
  }

  if (status === 'completed') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-xl">
          {meal?.emoji || icon}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-neutral-800">{label}</p>
          <p className="text-sm text-neutral-500">{meal?.name || 'Completed'}</p>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
    );
  }

  if (status === 'skipped') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 opacity-60 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-xl">
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-neutral-500">{label}</p>
          <p className="text-sm text-neutral-400">Skipped</p>
        </div>
      </div>
    );
  }

  // planned
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-xl">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-neutral-800">{label}</p>
        <p className="text-sm text-neutral-400">Planned for {SLOT_TIMES[slot]}</p>
      </div>
      <button className="text-neutral-300 hover:text-neutral-500">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
    </div>
  );
}
