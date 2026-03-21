'use client';

import { useEffect, useState } from 'react';
import { DailyPlan } from '@/lib/types';
import { getDailyPlan, getCompletedCount, getActiveSlot } from '@/lib/store';
import { getTodaysIntention, Intention } from '@/data/intentions';
import GreetingHeader from '@/components/GreetingHeader';
import IntentionCard from '@/components/IntentionCard';
import DailyProgress from '@/components/DailyProgress';
import MealJourneyItem from '@/components/MealJourneyItem';
import FloatingActionButton from '@/components/FloatingActionButton';
import BottomNav from '@/components/BottomNav';

export default function Home() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [intention, setIntention] = useState<Intention | null>(null);

  useEffect(() => {
    const dailyPlan = getDailyPlan();
    setPlan(dailyPlan);
    setIntention(getTodaysIntention(dailyPlan.date));
  }, []);

  if (!plan || !intention) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

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
              <MealJourneyItem key={slotState.slot} slotState={slotState} />
            ))}
          </div>
        </div>
      </div>

      <FloatingActionButton activeSlot={activeSlot} />
      <BottomNav />
    </div>
  );
}
