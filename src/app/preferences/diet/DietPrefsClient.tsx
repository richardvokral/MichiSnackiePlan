'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  DIET_TYPES,
  DIET_LABELS,
  ALLERGENS,
  ALLERGEN_LABELS,
  DietType,
  DietPreferences,
} from '@/lib/diet';
import { getDietPrefsSnapshot, saveDietPrefs } from '@/lib/dietStore';
import RegisterPrompt from '@/components/RegisterPrompt';
import { saveDietPreferencesAction } from './actions';

interface DietPrefsClientProps {
  isAuthenticated: boolean;
  initialPrefs: DietPreferences | null;
}

interface DietDraft {
  dietType: DietType | '';
  allergies: string[];
}

const emptySubscribe = () => () => {};

export default function DietPrefsClient({ isAuthenticated, initialPrefs }: DietPrefsClientProps) {
  // Base values: signed-in users come from the server prop; anonymous users read
  // this device's localStorage copy via useSyncExternalStore (null during SSR).
  const stored = useSyncExternalStore(emptySubscribe, getDietPrefsSnapshot, () => null);
  const base = isAuthenticated ? initialPrefs : stored;

  // `draft` holds the user's in-progress edits; until they touch a control the
  // form mirrors `base`. This avoids seeding state from an effect.
  const [draft, setDraft] = useState<DietDraft | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);

  const dietType: DietType | '' = draft ? draft.dietType : (base?.dietType ?? '');
  const allergies: string[] = draft ? draft.allergies : (base?.allergies ?? []);

  function update(next: Partial<DietDraft>) {
    setSavedLocally(false);
    setDraft({ dietType, allergies, ...next });
  }

  function toggleAllergy(a: string) {
    const nextAllergies = allergies.includes(a) ? allergies.filter((x) => x !== a) : [...allergies, a];
    update({ allergies: nextAllergies });
  }

  function handleAnonSave() {
    saveDietPrefs({ dietType: dietType || null, allergies });
    setSavedLocally(true);
    setShowRegister(true);
  }

  const radioClass = 'flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm';

  const controls = (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-sm font-semibold text-neutral-700">Diet</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className={radioClass}>
            <input
              type="radio"
              name="dietType"
              value=""
              checked={dietType === ''}
              onChange={() => update({ dietType: '' })}
            />
            No restriction
          </label>
          {DIET_TYPES.map((d) => (
            <label key={d} className={radioClass}>
              <input
                type="radio"
                name="dietType"
                value={d}
                checked={dietType === d}
                onChange={() => update({ dietType: d })}
              />
              {DIET_LABELS[d]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-neutral-700">Allergies</legend>
        <p className="mt-1 text-xs text-neutral-400">Meals containing anything you pick will be hidden.</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ALLERGENS.map((a) => (
            <label key={a} className={radioClass}>
              <input
                type="checkbox"
                name="allergies"
                value={a}
                checked={allergies.includes(a)}
                onChange={() => toggleAllergy(a)}
              />
              {ALLERGEN_LABELS[a]}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );

  const saveButtonClass =
    'w-full rounded-full bg-purple-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-purple-700';

  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      <div className="mx-auto max-w-lg px-5 pt-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-700">
            ‹ Back
          </Link>
          <span className="text-sm font-semibold text-purple-700">Food preferences</span>
          <div className="w-10" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-neutral-800">Allergies &amp; diet</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Tell us what to avoid and we&apos;ll hide meals that don&apos;t fit when you plan your day.
        </p>

        <div className="mt-6">
          {isAuthenticated ? (
            <form action={saveDietPreferencesAction} className="space-y-6">
              {controls}
              <button type="submit" className={saveButtonClass}>
                Save preferences
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {controls}
              <button type="button" onClick={handleAnonSave} className={saveButtonClass}>
                Save preferences
              </button>
              {savedLocally && (
                <p className="text-center text-xs text-neutral-400">Saved on this device.</p>
              )}
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              >
                Register for free to save this for tomorrow
              </button>
            </div>
          )}
        </div>
      </div>

      <RegisterPrompt
        open={showRegister}
        onClose={() => setShowRegister(false)}
        title="Save your preferences"
        message="Register for free to keep your food preferences for tomorrow and on any device."
      />
    </div>
  );
}
