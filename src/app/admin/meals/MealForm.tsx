'use client';

import { Meal } from '@/lib/types';
import { useState } from 'react';
import Image from 'next/image';

const SLOT_OPTIONS = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'];
const PROTEIN_GROUPS = ['dairy', 'eggs', 'meat', 'fish', 'plant', 'nuts_seeds', 'supplement_protein'];
const MEAL_STYLES = ['sweet', 'savory', 'bowl', 'sandwich', 'salad', 'light', 'main_meal'];
const FRUIT_VEG_OPTIONS = ['fruit', 'veg', 'both', 'none'];
const STATUS_OPTIONS = ['draft', 'published', 'inactive'];

interface MealFormProps {
  meal?: Meal & { updatedAt?: string };
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}

export default function MealForm({ meal, action, submitLabel }: MealFormProps) {
  const [imageUrl, setImageUrl] = useState(meal?.imageUrl || '');
  const [uploading, setUploading] = useState(false);

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

      <div>
        <label className={labelClass}>Image</label>
        {imageUrl && (
          <Image src={imageUrl} alt="Meal" width={128} height={128} className="mb-2 rounded-lg object-cover" />
        )}
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} className="text-sm" />
        {uploading && <p className="text-xs text-purple-500">Uploading...</p>}
      </div>

      <div>
        <label className={labelClass}>Status</label>
        <select name="status" defaultValue={meal?.status || 'draft'} className={inputClass}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

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
        }}
      >
        {submitLabel}
      </button>
    </form>
  );
}
