'use client';

import { Ingredient } from '@/lib/types';
import { DIET_TYPES, ALLERGENS } from '@/lib/diet';

interface IngredientFormProps {
  ingredient?: Ingredient;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}

const inputClass =
  'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none';
const labelClass = 'block text-sm font-medium text-neutral-700 mb-1';
const STATUS_OPTIONS = ['draft', 'published', 'inactive'];

export default function IngredientForm({ ingredient, action, submitLabel }: IngredientFormProps) {
  return (
    <form action={action} className="space-y-5">
      {ingredient && <input type="hidden" name="id" value={ingredient.id} />}
      <input type="hidden" name="allergens" id="ing_allergens" />
      {/* Provenance is preserved on edit; defaults to manual for new entries. */}
      <input type="hidden" name="source" value={ingredient?.source ?? 'manual'} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Name</label>
          <input name="name" defaultValue={ingredient?.name} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>USDA FDC id (optional)</label>
          <input name="usdaFdcId" defaultValue={ingredient?.usdaFdcId ?? ''} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Nutrition (per 100g, optional)</label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ['calories', 'Calories (kcal)'],
              ['proteinG', 'Protein (g)'],
              ['carbsG', 'Carbs (g)'],
              ['fatG', 'Fat (g)'],
            ] as const
          ).map(([name, label]) => {
            const value =
              name === 'calories'
                ? ingredient?.calories
                : name === 'proteinG'
                  ? ingredient?.proteinG
                  : name === 'carbsG'
                    ? ingredient?.carbsG
                    : ingredient?.fatG;
            return (
              <div key={name}>
                <label className="mb-1 block text-xs text-neutral-500">{label}</label>
                <input
                  name={name}
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={value ?? ''}
                  className={inputClass}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Diet classification</label>
          <select name="dietType" defaultValue={ingredient?.dietType ?? ''} className={inputClass}>
            <option value="">Unspecified</option>
            {DIET_TYPES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Allergens</label>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => (
              <label key={a} className="flex items-center gap-1 text-sm">
                <input type="checkbox" name={`allergen_${a}`} defaultChecked={ingredient?.allergens.includes(a)} />
                {a}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Status</label>
          <select name="status" defaultValue={ingredient?.status ?? 'draft'} className={inputClass}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-400">
            Only published ingredients can be attached to meals.
          </p>
        </div>
        <div>
          <label className={labelClass}>Source</label>
          <input
            value={ingredient?.source ?? 'manual'}
            disabled
            className={`${inputClass} bg-neutral-100 text-neutral-500`}
          />
        </div>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white hover:bg-purple-700"
        onClick={(e) => {
          const form = (e.target as HTMLElement).closest('form')!;
          const allergens = ALLERGENS.filter((a) => {
            const cb = form.querySelector(`[name="allergen_${a}"]`) as HTMLInputElement;
            return cb?.checked;
          });
          (form.querySelector('#ing_allergens') as HTMLInputElement).value = allergens.join(',');
        }}
      >
        {submitLabel}
      </button>
    </form>
  );
}
