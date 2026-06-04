'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import SearchableList from '@/components/SearchableList';
import { toggleFavoriteAction } from '@/app/favorites/actions';

interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

interface FavoritesClientProps {
  meals: FoodItem[];
  favoriteIds: string[];
}

export default function FavoritesClient({ meals, favoriteIds }: FavoritesClientProps) {
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(favoriteIds));
  const [, startTransition] = useTransition();

  function toggle(mealId: string) {
    const next = new Set(favorites);
    const willFavorite = !next.has(mealId);
    if (willFavorite) next.add(mealId);
    else next.delete(mealId);
    setFavorites(next);
    startTransition(async () => {
      await toggleFavoriteAction(mealId, willFavorite);
    });
  }

  return (
    <SearchableList
      items={meals}
      getKey={(m) => m.id}
      getSearchText={(m) => `${m.name} ${m.description}`}
      placeholder="Search foods…"
      renderItem={(m) => {
        const isFav = favorites.has(m.id);
        return (
          <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <span className="text-xl">{m.emoji || '🍽️'}</span>
            <Link
              href={`/meal/${m.id}`}
              className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-700 hover:text-purple-600"
            >
              {m.name}
            </Link>
            <button
              type="button"
              onClick={() => toggle(m.id)}
              aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
              className={`text-xl leading-none ${isFav ? 'text-berry-500' : 'text-neutral-300 hover:text-neutral-400'}`}
            >
              {isFav ? '♥' : '♡'}
            </button>
          </div>
        );
      }}
    />
  );
}
