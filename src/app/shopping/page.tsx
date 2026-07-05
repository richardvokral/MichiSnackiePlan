import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import {
  getUserPlan,
  getPublishedMealsForUser,
  getMealIngredientsForMeals,
} from '@/lib/repository';
import { buildShoppingList } from '@/lib/shoppingList';
import { Meal } from '@/lib/types';
import BottomNav from '@/components/BottomNav';
import ShoppingClient from './ShoppingClient';

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

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; days?: string }>;
}) {
  const { from, days } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 pb-28">
        <div className="mx-auto max-w-lg px-5 pt-16 text-center">
          <p className="text-4xl">🛒</p>
          <h1 className="mt-3 text-xl font-bold text-neutral-800">Shopping list</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Register for free to plan meals ahead and get their ingredients as one
            aggregated shopping list.
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

  const today = todayStr();
  const fromDate = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : today;
  const parsedDays = Number(days);
  const rangeDays = Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 14 ? parsedDays : 7;
  const dates = Array.from({ length: rangeDays }, (_, i) => addDays(fromDate, i));

  const [plans, meals] = await Promise.all([
    Promise.all(dates.map((date) => getUserPlan(user.id, date))),
    getPublishedMealsForUser(user.id),
  ]);
  const mealMap = new Map<string, Meal>(meals.map((m) => [m.id, m]));

  const occurrences = plans.flatMap((plan) =>
    plan.slots
      .map((s) => s.selectedMealId)
      .filter((id): id is string => Boolean(id))
      .map((mealId) => ({
        mealId,
        mealName: mealMap.get(mealId)?.name ?? 'Unknown meal',
      })),
  );

  const ingredientsByMealId = await getMealIngredientsForMeals(occurrences.map((o) => o.mealId));
  const list = buildShoppingList(occurrences, ingredientsByMealId);

  return (
    <div className="min-h-screen bg-neutral-50 pb-28 md:pb-8">
      <div className="mx-auto max-w-lg px-5 pt-6">
        <div className="flex items-center justify-between">
          <Link href="/week" className="text-sm text-neutral-500 hover:text-neutral-700">
            ‹ Week
          </Link>
          <span className="text-sm font-semibold text-purple-700">Shopping list</span>
          <div className="w-10" />
        </div>

        <ShoppingClient
          list={list}
          fromDate={fromDate}
          days={rangeDays}
          plannedMealCount={occurrences.length}
        />
      </div>
      <BottomNav />
    </div>
  );
}
