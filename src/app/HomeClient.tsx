'use client';

import { useSyncExternalStore } from 'react';
import { Meal } from '@/lib/types';
import { getDailyPlanSnapshot, getCompletedCount, getActiveSlot } from '@/lib/store';
import { getTodaysIntention } from '@/data/intentions';
import GreetingHeader from '@/components/GreetingHeader';
import IntentionCard from '@/components/IntentionCard';
import DailyProgress from '@/components/DailyProgress';
import MealJourneyItem from '@/components/MealJourneyItem';
import FloatingActionButton from '@/components/FloatingActionButton';
import BottomNav from '@/components/BottomNav';

const emptySubscribe = () => () => {};
const getServerSnapshot = () => null;

interface HomeClientProps {
  mealMap: Record<string, Meal>;
}

export default function HomeClient({ mealMap }: HomeClientProps) {
  const plan = useSyncExternalStore(emptySubscribe, getDailyPlanSnapshot, getServerSnapshot);

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  const intention = getTodaysIntention(plan.date);
  const completed = getCompletedCount(plan);
  const activeSlot = getActiveSlot(plan);

  return (
    <div className="min-h-screen bg-neutral-50 pb-28 md:pb-8">
      <div className="mx-auto max-w-lg px-5 pt-6">
        <GreetingHeader />

        <div className="mt-6">
          <IntentionCard intention={intention} />
        </div>

        <div className="mt-5">
          <DailyProgress completed={completed} total={5} />
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-neutral-500">
            Meal Journey
          </h2>
          <div className="space-y-3">
            {plan.slots.map((slotState) => (
              <MealJourneyItem
                key={slotState.slot}
                slotState={slotState}
                mealMap={mealMap}
              />
            ))}
          </div>
        </div>
      </div>

      <FloatingActionButton activeSlot={activeSlot} />
      <BottomNav />
    </div>
  );
}
