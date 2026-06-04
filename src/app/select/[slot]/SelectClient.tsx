'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DailyPlan, Meal, MealSlotId, SLOT_LABELS, SLOT_SUBTITLES, SLOT_ORDER } from '@/lib/types';
import { getDailyPlan, selectMeal, skipMeal } from '@/lib/store';
import { getDietPrefs } from '@/lib/dietStore';
import { DietPreferences } from '@/lib/diet';
import { getRecommendations } from '@/lib/recommendations';
import { RecommendationConfig } from '@/lib/recommendationConfig';
import { selectMealForDay, skipMealForDay } from '@/app/plan/actions';
import { toggleFavoriteAction } from '@/app/favorites/actions';
import StepProgress from '@/components/StepProgress';
import MealOptionCard from '@/components/MealOptionCard';
import RegisterPrompt from '@/components/RegisterPrompt';

interface SelectClientProps {
  slot: MealSlotId;
  meals: Meal[];
  config: RecommendationConfig;
  isAuthenticated: boolean;
  date: string;
  initialPlan: DailyPlan | null;
  recentMealIds: string[];
  pinnedMealId: string | null;
  dietPreferences: DietPreferences | null;
  favoriteIds: string[];
}

export default function SelectClient({
  slot,
  meals,
  config,
  isAuthenticated,
  date,
  initialPlan,
  recentMealIds,
  pinnedMealId,
  dietPreferences,
  favoriteIds,
}: SelectClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [, startFavTransition] = useTransition();
  const [busyMealId, setBusyMealId] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(favoriteIds));

  const stepIndex = SLOT_ORDER.indexOf(slot) + 1;
  const label = SLOT_LABELS[slot] || slot;
  const subtitle = SLOT_SUBTITLES[slot] || '';

  const homeHref = isAuthenticated ? `/?date=${date}` : '/';

  // Resolve the plan: DB plan (signed-in) or localStorage (anonymous, today).
  const plan = useMemo<DailyPlan | null>(() => {
    if (isAuthenticated) return initialPlan;
    if (typeof window === 'undefined') return null;
    return getDailyPlan();
  }, [isAuthenticated, initialPlan]);

  const currentMealId = plan?.slots.find((s) => s.slot === slot)?.selectedMealId ?? null;

  // Signed-in: prefs come from the server prop. Anonymous: read this device's
  // localStorage copy (resolved on the client, like the plan above).
  const effectiveDietPrefs = useMemo<DietPreferences | null>(() => {
    if (isAuthenticated) return dietPreferences;
    if (typeof window === 'undefined') return null;
    return getDietPrefs();
  }, [isAuthenticated, dietPreferences]);

  const recommended = useMemo(() => {
    if (!plan) return [];
    return getRecommendations(slot, plan, meals, config, {
      recentMealIds,
      pinnedMealId,
      dietPreferences: effectiveDietPrefs,
    });
  }, [plan, slot, meals, config, recentMealIds, pinnedMealId, effectiveDietPrefs]);

  function handleChoose(meal: Meal) {
    setBusyMealId(meal.id);
    if (isAuthenticated) {
      startTransition(async () => {
        await selectMealForDay(date, slot, meal.id);
        router.push(homeHref);
      });
    } else {
      selectMeal(slot, meal.id);
      router.push('/');
    }
  }

  function handleToggleFavorite(meal: Meal) {
    if (!isAuthenticated) {
      setShowRegister(true);
      return;
    }
    const willFavorite = !favorites.has(meal.id);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (willFavorite) next.add(meal.id);
      else next.delete(meal.id);
      return next;
    });
    startFavTransition(async () => {
      await toggleFavoriteAction(meal.id, willFavorite);
    });
  }

  function handleSkip() {
    if (isAuthenticated) {
      startTransition(async () => {
        await skipMealForDay(date, slot);
        router.push(homeHref);
      });
    } else {
      skipMeal(slot);
      router.push('/');
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-8">
      <div className="mx-auto max-w-lg px-5 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(homeHref)}
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
              isPinned={meal.id === pinnedMealId}
              isCurrent={meal.id === currentMealId}
              pending={isPending && busyMealId === meal.id}
              onChoose={handleChoose}
              isFavorite={favorites.has(meal.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
          {recommended.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-semibold text-neutral-600">No options available</p>
              <p className="mt-1 text-sm text-neutral-400">Try skipping this meal slot.</p>
            </div>
          )}
        </div>

        {/* Make your own meal */}
        <div className="mt-6 text-center">
          {isAuthenticated ? (
            <Link
              href="/meals/new"
              className="text-sm font-medium text-purple-500 transition-colors hover:text-purple-700"
            >
              ＋ Make your own meal
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="text-sm font-medium text-purple-500 transition-colors hover:text-purple-700"
            >
              ＋ Make your own meal
            </button>
          )}
        </div>

        {/* Skip */}
        <div className="mt-6">
          <button
            onClick={handleSkip}
            disabled={isPending}
            className="w-full py-2 text-center text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-600 disabled:opacity-50"
          >
            I&apos;m not hungry right now
          </button>
        </div>
      </div>

      <RegisterPrompt
        open={showRegister}
        onClose={() => setShowRegister(false)}
        title="Make your own meal"
        message="Register for free to create your own private meals and have them appear when you plan."
      />
    </div>
  );
}
