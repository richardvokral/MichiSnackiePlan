import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import {
  getUserPlan,
  getPublishedMealsForUser,
  getMealIngredientsForMeals,
  getUserEnergyUnit,
  getUserGoals,
} from '@/lib/repository';
import { computeDayNutrition } from '@/lib/nutrition';
import { hasGoals } from '@/lib/goals';
import { formatEnergy } from '@/lib/units';
import { Meal, SLOT_ICONS } from '@/lib/types';
import { autoFillDay, clearDay } from '@/app/plan/actions';
import BottomNav from '@/components/BottomNav';

export const dynamic = 'force-dynamic';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function formatDayHeading(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;
  const user = await getCurrentUser();
  const today = todayStr();

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 pb-28">
        <div className="mx-auto max-w-lg px-5 pt-16 text-center">
          <p className="text-4xl">🗓️</p>
          <h1 className="mt-3 text-xl font-bold text-neutral-800">Plan your week</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Register for free to plan meals days ahead, auto-fill whole days, and get a
            shopping list for the week.
          </p>
          <a
            href="/auth/sign-in"
            className="mt-6 inline-block rounded-full bg-purple-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
          >
            Register for free
          </a>
        </div>
        <BottomNav />
      </div>
    );
  }

  const startDate = start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : today;
  const dates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const [plans, meals, energyUnit, goals] = await Promise.all([
    Promise.all(dates.map((date) => getUserPlan(user.id, date))),
    getPublishedMealsForUser(user.id),
    getUserEnergyUnit(user.id),
    getUserGoals(user.id),
  ]);
  const mealMap = new Map<string, Meal>(meals.map((m) => [m.id, m]));

  // One batch ingredient fetch for every selected meal across the whole week.
  const allSelectedIds = plans.flatMap((p) =>
    p.slots.map((s) => s.selectedMealId).filter((id): id is string => Boolean(id)),
  );
  const ingredientsByMealId = await getMealIngredientsForMeals(allSelectedIds);

  return (
    <div className="min-h-screen bg-neutral-50 pb-28 md:pb-8">
      <div className="mx-auto max-w-lg px-5 pt-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-700">
            ‹ Back
          </Link>
          <span className="text-sm font-semibold text-purple-700">Week planner</span>
          <Link
            href={`/shopping?from=${startDate}&days=7`}
            className="text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            🛒 List
          </Link>
        </div>

        {/* Week navigation */}
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-white px-4 py-2 shadow-sm">
          <Link
            href={`/week?start=${addDays(startDate, -7)}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
            aria-label="Previous week"
          >
            ‹
          </Link>
          <span className="text-sm font-semibold text-neutral-700">
            {startDate === today ? 'This week' : `From ${formatDayHeading(startDate)}`}
          </span>
          <Link
            href={`/week?start=${addDays(startDate, 7)}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
            aria-label="Next week"
          >
            ›
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {plans.map((plan) => {
            const selectedIds = plan.slots
              .map((s) => s.selectedMealId)
              .filter((id): id is string => Boolean(id));
            const nutrition =
              selectedIds.length > 0 ? computeDayNutrition(selectedIds, ingredientsByMealId) : null;
            const energy = nutrition ? formatEnergy(nutrition.calories, energyUnit) : null;
            const hasEmpty = plan.slots.some((s) => !s.selectedMealId && s.status !== 'skipped');
            const isToday = plan.date === today;

            return (
              <div key={plan.date} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <Link
                    href={`/?date=${plan.date}`}
                    className={`text-sm font-bold hover:text-purple-700 ${
                      isToday ? 'text-purple-700' : 'text-neutral-800'
                    }`}
                  >
                    {isToday ? 'Today' : formatDayHeading(plan.date)}
                  </Link>
                  {nutrition && energy && (
                    <span className="text-xs font-semibold text-neutral-500">
                      {nutrition.approximate ? '~' : ''}
                      {energy.value} {energy.label}
                      {hasGoals(goals) && goals.targetKcal != null
                        ? ` / ${formatEnergy(goals.targetKcal, energyUnit).value}`
                        : ''}
                      {' · '}
                      {nutrition.approximate ? '~' : ''}
                      {nutrition.proteinG} g protein
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {plan.slots.map((slotState) => {
                    const meal = slotState.selectedMealId
                      ? mealMap.get(slotState.selectedMealId)
                      : undefined;
                    return (
                      <Link
                        key={slotState.slot}
                        href={meal ? `/meal/${meal.id}` : `/select/${slotState.slot}?date=${plan.date}`}
                        title={meal ? meal.name : 'Choose a meal'}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                          slotState.status === 'skipped'
                            ? 'bg-neutral-100 text-neutral-300 line-through'
                            : meal
                              ? 'bg-purple-50 text-purple-700'
                              : 'border border-dashed border-neutral-300 text-neutral-400 hover:border-purple-400 hover:text-purple-600'
                        }`}
                      >
                        <span aria-hidden>{SLOT_ICONS[slotState.slot]}</span>
                        <span className="max-w-24 truncate">
                          {slotState.status === 'skipped' ? 'skipped' : meal ? meal.name : 'choose'}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-3 flex gap-2">
                  {hasEmpty && (
                    <form action={autoFillDay.bind(null, plan.date)}>
                      <button
                        type="submit"
                        className="rounded-full bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-purple-700"
                      >
                        ✨ Auto-fill
                      </button>
                    </form>
                  )}
                  {selectedIds.length > 0 && (
                    <form action={clearDay.bind(null, plan.date)}>
                      <button
                        type="submit"
                        className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        Clear
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
