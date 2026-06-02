'use client';

import Image from 'next/image';
import { Meal } from '@/lib/types';
import Tag from './Tag';

interface MealOptionCardProps {
  meal: Meal;
  isPinned?: boolean;
  isCurrent?: boolean;
  pending?: boolean;
  onChoose: (meal: Meal) => void;
}

export default function MealOptionCard({ meal, isPinned, isCurrent, pending, onChoose }: MealOptionCardProps) {
  return (
    <div
      className={`w-full overflow-hidden rounded-2xl bg-white shadow-sm transition-all ${
        isCurrent ? 'ring-2 ring-purple-500' : ''
      }`}
    >
      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200">
        {meal.imageUrl ? (
          <Image src={meal.imageUrl} alt={meal.name} fill sizes="(max-width: 512px) 100vw, 512px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">{meal.emoji}</div>
        )}
        {isPinned && (
          <span className="absolute left-3 top-3 rounded-full bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
            ★ Your usual
          </span>
        )}
        {isCurrent && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-purple-700 shadow-sm">
            Current choice
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold text-neutral-800">{meal.name}</h3>
          <div className="flex flex-wrap gap-1">
            {meal.tags.map((tag) => (
              <Tag key={tag} label={tag} />
            ))}
          </div>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">{meal.description}</p>
        <button
          onClick={() => onChoose(meal)}
          disabled={pending}
          className="mt-4 w-full rounded-full bg-purple-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {pending ? 'Saving…' : isCurrent ? 'Keep this' : 'Choose this'}
        </button>
      </div>
    </div>
  );
}
