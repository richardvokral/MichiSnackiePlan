import { getMealDetail } from '@/lib/repository';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Tag from '@/components/Tag';
import { Allergen, ALLERGEN_LABELS, DietType, DIET_LABELS } from '@/lib/diet';

export const dynamic = 'force-dynamic';

function allergenLabel(a: string): string {
  return ALLERGEN_LABELS[a as Allergen] ?? a;
}

export default async function MealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getMealDetail(id);
  if (!detail) notFound();

  const { meal, ingredients, nutrition } = detail;
  const allergens = meal.allergens ?? [];

  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      <div className="mx-auto max-w-lg px-5 pt-6">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-700">
          ‹ Back
        </Link>

        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="relative h-48 w-full bg-gradient-to-br from-neutral-100 to-neutral-200">
            {meal.imageUrl ? (
              <Image src={meal.imageUrl} alt={meal.name} fill sizes="(max-width: 512px) 100vw, 512px" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl">{meal.emoji}</div>
            )}
          </div>
          <div className="p-5">
            <h1 className="text-2xl font-bold text-neutral-800">{meal.name}</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">{meal.description}</p>

            <div className="mt-3 flex flex-wrap gap-1">
              {meal.tags?.map((t) => <Tag key={t} label={t} />)}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {meal.dietType && (
                <span className="rounded-full bg-tag-veggie/10 px-2.5 py-1 font-medium text-tag-veggie">
                  {DIET_LABELS[meal.dietType as DietType]}
                </span>
              )}
              {allergens.length > 0 && (
                <span className="rounded-full bg-tag-dairy-free/10 px-2.5 py-1 font-medium text-tag-dairy-free">
                  Contains: {allergens.map(allergenLabel).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Nutrition */}
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Nutrition</h2>
          {ingredients.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-400">No ingredients listed yet.</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                {([
                  ['Calories', nutrition.calories, 'kcal'],
                  ['Protein', nutrition.proteinG, 'g'],
                  ['Carbs', nutrition.carbsG, 'g'],
                  ['Fat', nutrition.fatG, 'g'],
                ] as const).map(([label, value, unit]) => (
                  <div key={label} className="rounded-xl bg-neutral-50 py-3">
                    <p className="text-lg font-bold text-neutral-800">{value}</p>
                    <p className="text-[11px] text-neutral-400">
                      {label} ({unit})
                    </p>
                  </div>
                ))}
              </div>
              {nutrition.approximate && (
                <p className="mt-2 text-xs text-neutral-400">
                  Approximate — some ingredients use non-weight units or lack full nutrition data.
                </p>
              )}
            </>
          )}
        </div>

        {/* Ingredients */}
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Ingredients</h2>
          {ingredients.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-400">No ingredients listed yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-100">
              {ingredients.map((mi) => (
                <li key={mi.ingredientId} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-neutral-700">{mi.ingredient?.name ?? mi.ingredientId}</span>
                  <span className="text-neutral-400">
                    {mi.quantity} {mi.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
