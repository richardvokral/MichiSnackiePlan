'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { ShoppingList } from '@/lib/shoppingList';
import { subscribeChecked, getChecked, getEmptyChecked, setChecked, clearChecked } from '@/lib/shoppingStore';

interface ShoppingClientProps {
  list: ShoppingList;
  fromDate: string;
  days: number;
  plannedMealCount: number;
}

// Checked-off state lives in this device's localStorage, keyed by the date
// range — a new week (or range) starts with a fresh, unchecked list.
export default function ShoppingClient({ list, fromDate, days, plannedMealCount }: ShoppingClientProps) {
  const storageKey = `msp:shopping:${fromDate}:${days}`;
  const checked = useSyncExternalStore(
    subscribeChecked,
    () => getChecked(storageKey),
    getEmptyChecked,
  );

  function toggle(key: string) {
    setChecked(storageKey, { ...checked, [key]: !checked[key] });
  }

  function resetChecks() {
    clearChecked(storageKey);
  }

  const checkedCount = list.items.filter((i) => checked[i.key]).length;
  const rangeLabel =
    days === 1
      ? formatDate(fromDate)
      : `${formatDate(fromDate)} – ${formatDate(addDays(fromDate, days - 1))}`;

  return (
    <>
      <div className="mt-5 rounded-2xl bg-neutral-100 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-purple-600">
          {rangeLabel}
        </p>
        <div className="mt-1 flex items-baseline justify-between">
          <p className="text-lg font-bold text-neutral-800">
            {plannedMealCount === 0
              ? 'No meals planned yet'
              : `${list.items.length} items for ${plannedMealCount} meals`}
          </p>
          {checkedCount > 0 && (
            <button
              onClick={resetChecks}
              className="text-xs font-medium text-neutral-400 hover:text-neutral-600"
            >
              Reset ({checkedCount})
            </button>
          )}
        </div>
      </div>

      {plannedMealCount === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-3xl">🗓️</p>
          <p className="mt-2 text-sm text-neutral-500">
            Plan a few days first — the list builds itself from your planned meals.
          </p>
          <Link
            href="/week"
            className="mt-4 inline-block rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
          >
            Open week planner
          </Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-100 rounded-2xl bg-white px-4 shadow-sm">
          {list.items.map((item) => {
            const isChecked = Boolean(checked[item.key]);
            return (
              <li key={item.key}>
                <button
                  onClick={() => toggle(item.key)}
                  className="flex w-full items-center gap-3 py-3 text-left"
                >
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                      isChecked
                        ? 'border-purple-500 bg-purple-500 text-white'
                        : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {isChecked ? '✓' : ''}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm font-medium ${
                        isChecked ? 'text-neutral-300 line-through' : 'text-neutral-700'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="block truncate text-[11px] text-neutral-400">
                      {item.mealNames.join(', ')}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-sm ${
                      isChecked ? 'text-neutral-300 line-through' : 'text-neutral-500'
                    }`}
                  >
                    {item.quantity} {item.unit}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {list.missingMeals.length > 0 && (
        <p className="mt-3 text-xs text-neutral-400">
          No ingredient data yet for: {list.missingMeals.join(', ')} — these meals aren&apos;t
          covered by the list.
        </p>
      )}
    </>
  );
}

function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
