'use client';

import { Meal, Ingredient, MealIngredient } from '@/lib/types';
import { DIET_TYPES, ALLERGENS } from '@/lib/diet';
import { checkMealWeight } from '@/lib/mealValidation';
import { useState } from 'react';
import Image from 'next/image';

const SLOT_OPTIONS = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'];
const PROTEIN_GROUPS = ['dairy', 'eggs', 'meat', 'fish', 'plant', 'nuts_seeds', 'supplement_protein'];
const MEAL_STYLES = ['sweet', 'savory', 'bowl', 'sandwich', 'salad', 'light', 'main_meal'];
const FRUIT_VEG_OPTIONS = ['fruit', 'veg', 'both', 'none'];
const STATUS_OPTIONS = ['draft', 'published', 'inactive'];
const UNIT_OPTIONS = ['g', 'ml', 'piece'];

interface IngredientRow {
  ingredientId: string;
  quantity: string;
  unit: string;
}

interface MealFormProps {
  meal?: Meal & { updatedAt?: string };
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  allIngredients?: Ingredient[];
  initialMealIngredients?: MealIngredient[];
  hideStatus?: boolean;
}

export default function MealForm({
  meal,
  action,
  submitLabel,
  allIngredients = [],
  initialMealIngredients = [],
  hideStatus = false,
}: MealFormProps) {
  const [imageUrl, setImageUrl] = useState(meal?.imageUrl || '');
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState<IngredientRow[]>(
    initialMealIngredients.map((mi) => ({
      ingredientId: mi.ingredientId,
      quantity: String(mi.quantity),
      unit: mi.unit,
    })),
  );
  const [toAdd, setToAdd] = useState('');
  const [totalWeight, setTotalWeight] = useState(
    meal?.totalWeightG != null ? String(meal.totalWeightG) : '',
  );

  const ingredientName = new Map(allIngredients.map((i) => [i.id, i.name]));
  const available = allIngredients.filter((i) => !rows.some((r) => r.ingredientId === i.id));

  function addRow() {
    if (!toAdd) return;
    setRows((prev) => [...prev, { ingredientId: toAdd, quantity: '100', unit: 'g' }]);
    setToAdd('');
  }
  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.ingredientId !== id));
  }
  function updateRow(id: string, patch: Partial<IngredientRow>) {
    setRows((prev) => prev.map((r) => (r.ingredientId === id ? { ...r, ...patch } : r)));
  }

  const mealIngredientsJson = JSON.stringify(
    rows.map((r) => ({ ingredientId: r.ingredientId, quantity: Number(r.quantity) || 0, unit: r.unit })),
  );

  const weightCheck = checkMealWeight(
    rows.map((r) => ({ quantity: Number(r.quantity) || 0, unit: r.unit })),
    totalWeight === '' ? null : Number(totalWeight),
  );

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) setImageUrl(data.url);
      else alert(data.error || 'Upload failed');
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none';
  const labelClass = 'block text-sm font-medium text-neutral-700 mb-1';

  return (
    <form action={action} className="space-y-5">
      {meal && <input type="hidden" name="id" value={meal.id} />}
      {meal?.updatedAt && <input type="hidden" name="updatedAt" value={meal.updatedAt} />}
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <input type="hidden" name="mealIngredientsJson" value={mealIngredientsJson} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Name</label>
          <input name="name" defaultValue={meal?.name} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Emoji</label>
          <input name="emoji" defaultValue={meal?.emoji} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea name="description" defaultValue={meal?.description} required rows={3} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Allowed Slots</label>
        <div className="flex flex-wrap gap-2">
          {SLOT_OPTIONS.map((s) => (
            <label key={s} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                name={`slot_${s}`}
                defaultChecked={meal?.mealSlotAllowed.includes(s as Meal['mealSlotAllowed'][number])}
              />
              {s}
            </label>
          ))}
        </div>
        <input type="hidden" name="mealSlotAllowed" id="mealSlotAllowed" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Category</label>
          <input name="category" defaultValue={meal?.category} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Main Protein</label>
          <input name="mainProtein" defaultValue={meal?.mainProtein} required className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Protein Group</label>
          <select name="proteinGroup" defaultValue={meal?.proteinGroup} required className={inputClass}>
            {PROTEIN_GROUPS.map((pg) => <option key={pg} value={pg}>{pg}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Carb Base</label>
          <input name="carbBase" defaultValue={meal?.carbBase} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Fruit/Veg</label>
          <select name="fruitOrVeg" defaultValue={meal?.fruitOrVeg} required className={inputClass}>
            {FRUIT_VEG_OPTIONS.map((fv) => <option key={fv} value={fv}>{fv}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Meal Styles</label>
        <div className="flex flex-wrap gap-2">
          {MEAL_STYLES.map((s) => (
            <label key={s} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                name={`style_${s}`}
                defaultChecked={meal?.mealStyle.includes(s as Meal['mealStyle'][number])}
              />
              {s}
            </label>
          ))}
        </div>
        <input type="hidden" name="mealStyle" id="mealStyle" />
      </div>

      <div>
        <label className={labelClass}>Tags (comma-separated)</label>
        <input name="tags" defaultValue={meal?.tags.join(', ')} className={inputClass} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Diet classification</label>
          <select name="dietType" defaultValue={meal?.dietType ?? ''} className={inputClass}>
            <option value="">Auto (from protein group)</option>
            {DIET_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <p className="mt-1 text-xs text-neutral-400">
            Strictest diet this meal satisfies. Leave on Auto to derive from the protein group.
          </p>
        </div>
        <div>
          <label className={labelClass}>Allergens</label>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => (
              <label key={a} className="flex items-center gap-1 text-sm">
                <input type="checkbox" name={`allergen_${a}`} defaultChecked={meal?.allergens?.includes(a)} />
                {a}
              </label>
            ))}
          </div>
          <input type="hidden" name="allergens" id="allergens" />
          <label className="mt-2 flex items-center gap-1 text-sm">
            <input type="checkbox" name="allergensOverride" defaultChecked={meal?.allergensOverride} />
            These allergens are authoritative
          </label>
        </div>
      </div>

      <div>
        <label className={labelClass}>Ingredients</label>
        {allIngredients.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No ingredients in the catalog yet. Add some under Admin → Ingredients first.
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-neutral-400">
              Attached ingredients drive this meal&apos;s nutrition and its derived allergen/diet
              info (unless overridden above).
            </p>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.ingredientId} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm text-neutral-700">
                    {ingredientName.get(r.ingredientId) ?? r.ingredientId}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={r.quantity}
                    onChange={(e) => updateRow(r.ingredientId, { quantity: e.target.value })}
                    className="w-24 rounded-lg border border-neutral-300 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none"
                  />
                  <select
                    value={r.unit}
                    onChange={(e) => updateRow(r.ingredientId, { unit: e.target.value })}
                    className="rounded-lg border border-neutral-300 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRow(r.ingredientId)}
                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {rows.length === 0 && <p className="text-sm text-neutral-400">No ingredients attached.</p>}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <select
                value={toAdd}
                onChange={(e) => setToAdd(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none"
              >
                <option value="">Add an ingredient…</option>
                {available.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addRow}
                disabled={!toAdd}
                className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:bg-neutral-300"
              >
                Add
              </button>
            </div>
          </>
        )}
      </div>

      <div>
        <label className={labelClass}>Total weight (g, optional)</label>
        <input
          name="totalWeightG"
          type="number"
          step="any"
          min="0"
          value={totalWeight}
          onChange={(e) => setTotalWeight(e.target.value)}
          className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-neutral-400">
          Summable ingredients total {weightCheck.sumG}g
          {weightCheck.indeterminate ? ' (excludes non-gram units)' : ''}.
        </p>
        {totalWeight !== '' && !weightCheck.ok && (
          <p className="mt-1 text-xs text-red-500">
            Ingredient weights ({weightCheck.sumG}g) exceed the total weight ({weightCheck.totalG}g).
          </p>
        )}
      </div>

      <div>
        <label className={labelClass}>Image</label>
        {imageUrl && (
          <Image src={imageUrl} alt="Meal" width={128} height={128} className="mb-2 rounded-lg object-cover" />
        )}
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} className="text-sm" />
        {uploading && <p className="text-xs text-purple-500">Uploading...</p>}
      </div>

      {!hideStatus && (
        <div>
          <label className={labelClass}>Status</label>
          <select name="status" defaultValue={meal?.status || 'draft'} className={inputClass}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      <button
        type="submit"
        className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white hover:bg-purple-700"
        onClick={(e) => {
          const form = (e.target as HTMLElement).closest('form')!;
          const slots = SLOT_OPTIONS.filter((s) => {
            const cb = form.querySelector(`[name="slot_${s}"]`) as HTMLInputElement;
            return cb?.checked;
          });
          (form.querySelector('#mealSlotAllowed') as HTMLInputElement).value = slots.join(',');
          const styles = MEAL_STYLES.filter((s) => {
            const cb = form.querySelector(`[name="style_${s}"]`) as HTMLInputElement;
            return cb?.checked;
          });
          (form.querySelector('#mealStyle') as HTMLInputElement).value = styles.join(',');
          const allergens = ALLERGENS.filter((a) => {
            const cb = form.querySelector(`[name="allergen_${a}"]`) as HTMLInputElement;
            return cb?.checked;
          });
          (form.querySelector('#allergens') as HTMLInputElement).value = allergens.join(',');
        }}
      >
        {submitLabel}
      </button>
    </form>
  );
}
