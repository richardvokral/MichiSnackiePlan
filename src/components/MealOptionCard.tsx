'use client';

import { Meal } from '@/lib/types';
import Tag from './Tag';

interface MealOptionCardProps {
  meal: Meal;
  selected: boolean;
  onSelect: (meal: Meal) => void;
}

export default function MealOptionCard({ meal, selected, onSelect }: MealOptionCardProps) {
  return (
    <button
      onClick={() => onSelect(meal)}
      className={`w-full text-left rounded-2xl bg-white shadow-sm transition-all ${
        selected
          ? 'ring-2 ring-purple-500 shadow-md'
          : 'hover:shadow-md'
      }`}
    >
      <div className="relative h-44 w-full overflow-hidden rounded-t-2xl bg-gradient-to-br from-neutral-100 to-neutral-200">
        <div className="flex h-full items-center justify-center text-6xl">
          {meal.emoji}
        </div>
        <button
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-colors hover:bg-white"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={selected ? '#6b4580' : 'none'} stroke="#6b4580" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
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
      </div>
    </button>
  );
}
