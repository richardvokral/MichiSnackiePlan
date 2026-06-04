// Anonymous (not-signed-in) dietary preferences, persisted in localStorage —
// mirrors the daily-plan store in `store.ts`. Signed-in users read/write the DB
// instead (see repository/dietPreferences.ts).
import { DietPreferences, isDietType, isAllergen } from './diet';

const STORAGE_KEY = 'michi_diet_prefs';

export function getDietPrefs(): DietPreferences | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    const raw = JSON.parse(stored);
    // Tolerate older/malformed shapes — never trust localStorage blindly.
    const dietType = isDietType(raw?.dietType) ? raw.dietType : null;
    const allergies = Array.isArray(raw?.allergies) ? raw.allergies.filter(isAllergen) : [];
    return { dietType, allergies };
  } catch {
    return null;
  }
}

export function saveDietPrefs(prefs: DietPreferences): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function clearDietPrefs(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// Reference-stable snapshot for useSyncExternalStore — only allocates when the
// stored value actually changes (same trick as getDailyPlanSnapshot in store.ts).
let snapshotCache: { key: string; prefs: DietPreferences | null } | null = null;

export function getDietPrefsSnapshot(): DietPreferences | null {
  const prefs = getDietPrefs();
  const key = JSON.stringify(prefs);
  if (!snapshotCache || snapshotCache.key !== key) {
    snapshotCache = { key, prefs };
  }
  return snapshotCache.prefs;
}
