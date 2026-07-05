'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore, useTransition } from 'react';
import { DailyPlan, Meal } from '@/lib/types';
import { getDailyPlanSnapshot, getCompletedCount, getActiveSlot } from '@/lib/store';
import { getDietPrefs, getDietPrefsSnapshot, clearDietPrefs } from '@/lib/dietStore';
import { importDietPreferencesAction } from '@/app/preferences/diet/actions';
import { getTodaysIntention } from '@/data/intentions';
import { DayNutrition } from '@/lib/nutrition';
import { UserGoals } from '@/lib/goals';
import { EnergyUnit } from '@/lib/units';
import GreetingHeader from '@/components/GreetingHeader';
import IntentionCard from '@/components/IntentionCard';
import DailyProgress from '@/components/DailyProgress';
import DailyNutritionCard from '@/components/DailyNutritionCard';
import MealJourneyItem from '@/components/MealJourneyItem';
import FloatingActionButton from '@/components/FloatingActionButton';
import BottomNav from '@/components/BottomNav';
import Modal from '@/components/Modal';

const emptySubscribe = () => () => {};
const getServerSnapshot = () => null;

function addDays(dateStr: string, delta: number): string {
  // Work in UTC so day math doesn't drift across local timezones.
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function formatDay(dateStr: string, isToday: boolean): string {
  if (isToday) return 'Today';
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === addDays(today, -1)) return 'Yesterday';
  if (dateStr === addDays(today, 1)) return 'Tomorrow';
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

interface HomeClientProps {
  mealMap: Record<string, Meal>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userEmail: string | null;
  initialPlan: DailyPlan | null;
  date: string;
  isToday: boolean;
  hasDietPrefs: boolean;
  dayNutrition: DayNutrition | null;
  goals: UserGoals | null;
  energyUnit: EnergyUnit;
}

export default function HomeClient({
  mealMap,
  isAuthenticated,
  isAdmin,
  userEmail,
  initialPlan,
  date,
  isToday,
  hasDietPrefs,
  dayNutrition,
  goals,
  energyUnit,
}: HomeClientProps) {
  // Anonymous users keep a today-only plan in localStorage; authenticated users
  // get their persisted plan for the selected day from the server.
  const localPlan = useSyncExternalStore(emptySubscribe, getDailyPlanSnapshot, getServerSnapshot);
  const plan = isAuthenticated ? initialPlan : localPlan;

  // Diet prefs: server-provided for signed-in users; for anonymous users, read
  // this device's localStorage copy so the CTA reflects what they've set.
  const localDietPrefs = useSyncExternalStore(emptySubscribe, getDietPrefsSnapshot, getServerSnapshot);
  const localHasPrefs = Boolean(
    localDietPrefs && (localDietPrefs.dietType || localDietPrefs.allergies.length > 0),
  );
  const hasPrefs = isAuthenticated ? hasDietPrefs : localHasPrefs;

  // Offer to import a just-signed-in user's local prefs into their account
  // (only when the account doesn't already have prefs).
  const [importDismissed, setImportDismissed] = useState(false);
  const [imported, setImported] = useState(false);
  const [importing, startImport] = useTransition();
  const showImport = isAuthenticated && !hasDietPrefs && localHasPrefs && !importDismissed && !imported;

  function doImport() {
    startImport(async () => {
      const local = getDietPrefs();
      if (!local) {
        setImportDismissed(true);
        return;
      }
      await importDietPreferencesAction({ dietType: local.dietType, allergies: local.allergies });
      clearDietPrefs();
      setImported(true);
    });
  }

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
  const journeyDate = isAuthenticated ? date : undefined;

  return (
    <div className="min-h-screen bg-neutral-50 pb-28 md:pb-8">
      <div className="mx-auto max-w-lg px-5 pt-6">
        {/* Account bar */}
        <div className="mb-4 flex items-center justify-between text-xs">
          {isAuthenticated ? (
            <>
              <span className="truncate text-neutral-500">{userEmail ?? 'Signed in'}</span>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <Link href="/admin" className="rounded-full bg-purple-600 px-3 py-1 font-semibold text-white hover:bg-purple-700">
                    Admin
                  </Link>
                )}
                <Link href="/meals" className="font-medium text-purple-600 hover:text-purple-700">
                  My meals
                </Link>
                <Link href="/preferences" className="font-medium text-purple-600 hover:text-purple-700">
                  Preferences
                </Link>
                <a href="/auth/sign-out" className="text-neutral-400 hover:text-neutral-600">
                  Sign out
                </a>
              </div>
            </>
          ) : (
            <>
              <span className="text-neutral-400">Using today only · not signed in</span>
              <a href="/auth/sign-in" className="font-semibold text-purple-600 hover:text-purple-700">
                Sign in
              </a>
            </>
          )}
        </div>

        <GreetingHeader date={isAuthenticated ? date : undefined} isAuthenticated={isAuthenticated} />

        {/* Day navigation (signed-in, multi-day) */}
        {isAuthenticated && (
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-white px-4 py-2 shadow-sm">
            <Link
              href={`/?date=${addDays(date, -1)}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
              aria-label="Previous day"
            >
              ‹
            </Link>
            <span className="text-sm font-semibold text-neutral-700">{formatDay(date, isToday)}</span>
            <Link
              href={`/?date=${addDays(date, 1)}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
              aria-label="Next day"
            >
              ›
            </Link>
          </div>
        )}

        {/* Food preferences CTA — one-liner to set allergies & diet */}
        <Link
          href="/preferences/diet"
          className="mt-5 flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
        >
          <span className="flex items-center gap-2">
            <span>🥗</span>
            {hasPrefs ? 'Edit your food preferences' : 'Set your food preferences'}
          </span>
          <span aria-hidden className="text-blue-400">›</span>
        </Link>

        <div className="mt-6">
          <IntentionCard intention={intention} />
        </div>

        <div className="mt-5">
          <DailyProgress completed={completed} total={5} />
        </div>

        {isAuthenticated && dayNutrition && (
          <div className="mt-5">
            <DailyNutritionCard nutrition={dayNutrition} goals={goals} serverUnit={energyUnit} />
          </div>
        )}

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
                date={journeyDate}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        </div>
      </div>

      <FloatingActionButton activeSlot={activeSlot} date={journeyDate} />
      <BottomNav />

      <Modal
        open={showImport}
        onClose={() => setImportDismissed(true)}
        title="Import your food preferences?"
      >
        <p className="text-sm leading-relaxed text-neutral-500">
          You set allergies &amp; diet on this device before signing in. Import them to your account
          so they follow you everywhere?
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={doImport}
            disabled={importing}
            className="w-full rounded-full bg-purple-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:bg-neutral-300"
          >
            {importing ? 'Importing…' : 'Import preferences'}
          </button>
          <button
            onClick={() => setImportDismissed(true)}
            className="w-full py-2 text-center text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-600"
          >
            Not now
          </button>
        </div>
      </Modal>
    </div>
  );
}
