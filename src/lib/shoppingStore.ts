// Shopping-list checked-off state, persisted in localStorage per date range.
// useSyncExternalStore-compatible: the snapshot is cached per (key, raw) pair so
// repeated calls return the same object reference and never loop renders.

type CheckedMap = Record<string, boolean>;

const EMPTY: CheckedMap = {};
const listeners = new Set<() => void>();

let cacheKey: string | null = null;
let cacheRaw: string | null = null;
let cacheValue: CheckedMap = EMPTY;

export function subscribeChecked(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Server snapshot — also the client value when localStorage is unavailable.
export function getEmptyChecked(): CheckedMap {
  return EMPTY;
}

export function getChecked(storageKey: string): CheckedMap {
  if (typeof window === 'undefined') return EMPTY;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch {
    return EMPTY;
  }
  if (cacheKey === storageKey && cacheRaw === raw) return cacheValue;
  cacheKey = storageKey;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as CheckedMap) : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

export function setChecked(storageKey: string, value: CheckedMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // localStorage unavailable (private mode) — keep the in-memory cache so the
    // checklist still works for this page view.
  }
  cacheKey = storageKey;
  cacheRaw = JSON.stringify(value);
  cacheValue = value;
  for (const listener of listeners) listener();
}

export function clearChecked(storageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
  cacheKey = storageKey;
  cacheRaw = null;
  cacheValue = EMPTY;
  for (const listener of listeners) listener();
}
