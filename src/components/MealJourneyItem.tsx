'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Meal, SlotState, SLOT_LABELS, SLOT_ICONS, SLOT_TIMES } from '@/lib/types';
import SkipMealButton from './SkipMealButton';

interface MealJourneyItemProps {
  slotState: SlotState;
  mealMap: Record<string, Meal>;
  date?: string;
  isAuthenticated?: boolean;
}

function MealThumb({ meal, fallback }: { meal: Meal | null; fallback: string }) {
  if (meal?.imageUrl) {
    return (
      <div className="relative h-12 w-12 overflow-hidden rounded-full">
        <Image src={meal.imageUrl} alt={meal.name} fill sizes="48px" className="object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-xl">
      {meal?.emoji || fallback}
    </div>
  );
}

export default function MealJourneyItem({ slotState, mealMap, date, isAuthenticated = false }: MealJourneyItemProps) {
  const { slot, status, selectedMealId } = slotState;
  const label = SLOT_LABELS[slot];
  const icon = SLOT_ICONS[slot];
  const meal = selectedMealId ? mealMap[selectedMealId] : null;
  const selectHref = date ? `/select/${slot}?date=${date}` : `/select/${slot}`;

  if (status === 'active') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-purple-300 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        <Link href={selectHref} className="flex flex-1 items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-xl">
            {icon}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-neutral-800">{label}</p>
            <p className="text-sm font-medium text-purple-500">Track now</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <SkipMealButton
            slot={slot}
            isAuthenticated={isAuthenticated}
            date={date}
            className="text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-600"
          />
          <Link
            href={selectHref}
            className="rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700"
          >
            Add
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <Link href={selectHref} className="block">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
          <MealThumb meal={meal} fallback={icon} />
          <div className="flex-1">
            <p className="font-semibold text-neutral-800">{label}</p>
            <p className="text-sm text-neutral-500">{meal?.name || 'Completed'}</p>
          </div>
          <span className="mr-1 text-xs font-medium text-purple-400">Change</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      </Link>
    );
  }

  if (status === 'skipped') {
    return (
      <Link href={selectHref} className="block">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 opacity-60 shadow-sm transition-shadow hover:opacity-100 hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-xl">
            {icon}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-neutral-500">{label}</p>
            <p className="text-sm text-neutral-400">Skipped — tap to choose</p>
          </div>
        </div>
      </Link>
    );
  }

  // planned
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <Link href={selectHref} className="flex flex-1 items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-xl">
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-neutral-800">{label}</p>
          <p className="text-sm text-neutral-400">Planned for {SLOT_TIMES[slot]}</p>
        </div>
      </Link>
      <SkipMealButton
        slot={slot}
        isAuthenticated={isAuthenticated}
        date={date}
        className="text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-600"
      />
    </div>
  );
}
