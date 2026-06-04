'use client';

import { useMemo, useState, ReactNode } from 'react';
import SearchInput from './SearchInput';

interface SearchableListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  getSearchText: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  placeholder?: string;
}

// Generic client-side searchable list: filters by case-insensitive substring on the
// text returned by getSearchText.
export default function SearchableList<T>({
  items,
  getKey,
  getSearchText,
  renderItem,
  placeholder,
}: SearchableListProps<T>) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => getSearchText(item).toLowerCase().includes(q));
  }, [items, query, getSearchText]);

  return (
    <div>
      <SearchInput value={query} onChange={setQuery} placeholder={placeholder} />
      <div className="mt-3 space-y-2">
        {filtered.map((item) => (
          <div key={getKey(item)}>{renderItem(item)}</div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-400">No matches.</p>
        )}
      </div>
    </div>
  );
}
