'use client';

import { MealValidationConfig, SLOT_BUCKETS } from '@/lib/mealValidationConfig';
import { updateMealValidationAction } from '@/app/admin/actions';

const inputClass =
  'w-24 rounded border border-neutral-300 px-2 py-1 text-sm text-right focus:border-purple-500 focus:outline-none';

export default function MealValidationForm({ config }: { config: MealValidationConfig }) {
  return (
    <form action={updateMealValidationAction} className="space-y-8">
      <label className="flex items-center gap-3">
        <input type="checkbox" name="enabled" defaultChecked={config.enabled} className="rounded" />
        <span className="text-sm text-neutral-700">Enforce kcal ranges when finalizing meals</span>
      </label>

      <div>
        <h3 className="mb-3 font-semibold text-neutral-800">Per-slot kcal range</h3>
        <div className="space-y-3">
          {SLOT_BUCKETS.map((slot) => (
            <div key={slot} className="flex items-center justify-between gap-3">
              <label className="text-sm capitalize text-neutral-700">{slot}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name={`kcal_${slot}_min`}
                  defaultValue={config.kcal[slot].min}
                  min={0}
                  className={inputClass}
                />
                <span className="text-xs text-neutral-400">to</span>
                <input
                  type="number"
                  name={`kcal_${slot}_max`}
                  defaultValue={config.kcal[slot].max}
                  min={0}
                  className={inputClass}
                />
                <span className="text-xs text-neutral-400">kcal</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-neutral-800">Protein tags (annotations, not gates)</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-neutral-700">&ldquo;protein&rdquo; tag at &ge; (g)</label>
            <input type="number" name="proteinMealMinG" defaultValue={config.protein.proteinMealMinG} min={0} className={inputClass} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-neutral-700">&ldquo;high_protein&rdquo; tag at &ge; (g)</label>
            <input type="number" name="highProteinMinG" defaultValue={config.protein.highProteinMinG} min={0} className={inputClass} />
          </div>
        </div>
      </div>

      <label className="flex items-center gap-3">
        <input type="checkbox" name="requireUsdaMatch" defaultChecked={config.requireUsdaMatch} className="rounded" />
        <span className="text-sm text-neutral-700">
          Require a USDA match (ingredient must have a USDA id) to count as trusted nutrition
        </span>
      </label>

      <button
        type="submit"
        className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white hover:bg-purple-700"
      >
        Save rules
      </button>
    </form>
  );
}
