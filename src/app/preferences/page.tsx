import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getPublishedMeals, getUserPreferences } from '@/lib/repository';
import { SLOT_ORDER, SLOT_LABELS } from '@/lib/types';
import { savePreferenceAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function PreferencesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');

  const [meals, prefs] = await Promise.all([
    getPublishedMeals(),
    getUserPreferences(user.id),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      <div className="mx-auto max-w-lg px-5 pt-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-700">
            ‹ Back
          </Link>
          <span className="text-sm font-semibold text-purple-700">Preferences</span>
          <div className="w-10" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link href="/preferences/diet" className="rounded-2xl bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md">
            <p className="text-2xl">🥗</p>
            <p className="mt-1 text-sm font-semibold text-neutral-700">Allergies &amp; diet</p>
          </Link>
          <Link href="/preferences/favorites" className="rounded-2xl bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md">
            <p className="text-2xl">♥</p>
            <p className="mt-1 text-sm font-semibold text-neutral-700">Favorites</p>
          </Link>
          <Link href="/preferences/goals" className="rounded-2xl bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md">
            <p className="text-2xl">🎯</p>
            <p className="mt-1 text-sm font-semibold text-neutral-700">Daily targets</p>
            <p className="mt-0.5 text-[11px] text-neutral-400">optional</p>
          </Link>
        </div>

        <h1 className="mt-8 text-2xl font-bold text-neutral-800">Recurring meals</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Pin a meal you always want for a slot (e.g. oatmeal every breakfast). It will
          appear first as “Your usual” when you plan that slot. Leave a slot on “No preference”
          to keep getting variety.
        </p>

        <div className="mt-6 space-y-3">
          {SLOT_ORDER.map((slot) => {
            const allowed = meals.filter((m) => m.mealSlotAllowed.includes(slot));
            const current = prefs[slot] ?? '';
            return (
              <form
                key={slot}
                action={savePreferenceAction}
                className="rounded-2xl bg-white p-4 shadow-sm"
              >
                <input type="hidden" name="slot" value={slot} />
                <label className="block text-sm font-semibold text-neutral-700">
                  {SLOT_LABELS[slot]}
                </label>
                <div className="mt-2 flex gap-2">
                  <select
                    name="mealId"
                    defaultValue={current}
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">No preference (varied)</option>
                    {allowed.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.emoji} {m.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                  >
                    Save
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </div>
    </div>
  );
}
